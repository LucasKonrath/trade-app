import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { CardTile } from "@/components/card-tile";
import { ProposeListingButton } from "@/components/propose-listing-button";
import { ENABLED_GAMES } from "@/lib/config";
import { formatBRL } from "@/lib/money";
import { getT } from "@/lib/i18n/server";
import { getUserTradeStats } from "@/lib/queries";
import type { ListingKind, OfferType } from "@prisma/client";

export const dynamic = "force-dynamic";

function relativeDaysLabel(
  date: Date,
  locale: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const ms = Date.now() - new Date(date).getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days < 1) return t("profile.today");
  if (days === 1) return t("profile.yesterday");
  if (days < 7) return t("profile.daysAgo", { count: days });
  if (days < 30) return t("profile.weeksAgo", { count: Math.floor(days / 7) });
  if (days < 365) return t("profile.monthsAgo", { count: Math.floor(days / 30) });
  return new Date(date).toLocaleDateString(locale, { month: "short", year: "numeric" });
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const [session, { t, locale }] = await Promise.all([auth(), getT()]);
  const user = await prisma.user.findUnique({
    where: { handle },
    select: {
      id: true,
      handle: true,
      name: true,
      image: true,
      createdAt: true,
      listings: {
        where: { card: { game: { slug: { in: ENABLED_GAMES } } } },
        include: {
          card: {
            include: {
              set: { select: { name: true, code: true } },
              game: { select: { slug: true } },
            },
          },
        },
        orderBy: [{ kind: "asc" }, { createdAt: "desc" }],
      },
    },
  });
  if (!user) notFound();

  const haves = user.listings.filter((l) => l.kind === "HAVE");
  const wants = user.listings.filter((l) => l.kind === "WANT");
  const canPropose = session?.user && session.user.id !== user.id;
  const tradeStats = await getUserTradeStats(user.id);

  const joinedLabel = user.createdAt.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
  const lastTradeLabel = tradeStats.lastFinishedAt
    ? relativeDaysLabel(tradeStats.lastFinishedAt, locale, t)
    : null;

  return (
    <section className="section">
      <div className="container">
        <div className="level mb-5">
          <div className="level-left">
            {user.image && (
              <figure className="image is-64x64 mr-4">
                <Image
                  src={user.image}
                  alt=""
                  width={64}
                  height={64}
                  style={{ borderRadius: "9999px" }}
                />
              </figure>
            )}
            <div>
              <h1 className="title is-3">@{user.handle}</h1>
              <p className="subtitle is-6 has-text-grey">
                {t("profile.summary", { haves: haves.length, wants: wants.length })}
              </p>
              <div className="tags mt-2" style={{ gap: "0.5rem" }}>
                <span
                  className={`tag ${tradeStats.finishedCount > 0 ? "is-success" : "is-light"}`}
                >
                  {t("profile.finishedTrades", { count: tradeStats.finishedCount })}
                </span>
                {lastTradeLabel && (
                  <span className="tag is-light">
                    {t("profile.lastTrade", { when: lastTradeLabel })}
                  </span>
                )}
                <span className="tag is-light">
                  {t("profile.joined", { date: joinedLabel })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Section
          title={t("profile.haveTitle")}
          tone="is-success"
          listings={haves}
          canPropose={!!canPropose}
          ownerId={user.id}
          emptyLabel={t("profile.noneListed")}
        />
        <Section
          title={t("profile.wantTitle")}
          tone="is-warning"
          listings={wants}
          canPropose={!!canPropose}
          ownerId={user.id}
          emptyLabel={t("profile.noneListed")}
        />
      </div>
    </section>
  );
}

function Section({
  title,
  tone,
  listings,
  canPropose,
  ownerId,
  emptyLabel,
}: {
  title: string;
  tone: string;
  listings: {
    id: string;
    cardId: string;
    kind: ListingKind;
    quantity: number;
    condition: string | null;
    note: string | null;
    offerType: OfferType;
    priceCents: number | null;
    card: {
      name: string;
      imageUrl: string | null;
      number: string | null;
      rarity: string | null;
      orientation: string | null;
      set: { name: string; code: string };
      game: { slug: string };
    };
  }[];
  canPropose: boolean;
  ownerId: string;
  emptyLabel: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="title is-5 mb-3">
        <span className={`tag ${tone} mr-2`}>{title}</span>
        <span className="has-text-grey is-size-6">({listings.length})</span>
      </h2>
      {listings.length === 0 ? (
        <div className="has-text-grey is-italic is-size-7">{emptyLabel}</div>
      ) : (
        <div className="columns is-mobile is-multiline is-variable is-3">
          {listings.map((l) => (
            <div key={l.id} className="column is-2-desktop is-one-third-tablet is-half-mobile">
              <CardTile
                name={l.card.name}
                imageUrl={l.card.imageUrl}
                setName={l.card.set.name}
                number={l.card.number}
                rarity={l.card.rarity}
                gameSlug={l.card.game.slug}
                orientation={l.card.orientation}
                href={`/cards/${l.cardId}`}
                footer={
                  <div className="is-size-7">
                    <div className="has-text-grey">
                      qty {l.quantity}
                      {l.condition ? ` · ${l.condition}` : ""}
                    </div>
                    {l.priceCents !== null && (
                      <div className="mt-1">
                        <span className="tag is-primary is-small">
                          {formatBRL(l.priceCents)}
                          {l.quantity > 1 ? " cada" : ""}
                          {l.offerType === "CASH_ONLY" ? " · cash" : ""}
                        </span>
                      </div>
                    )}
                    {l.note && (
                      <div style={{ lineHeight: 1.3 }} className="mt-1 has-text-grey">
                        {l.note}
                      </div>
                    )}
                    {canPropose && (
                      <div className="mt-2">
                        <ProposeListingButton
                          ownerId={ownerId}
                          cardId={l.cardId}
                          kind={l.kind}
                          offerType={l.offerType}
                          priceCents={l.priceCents}
                        />
                      </div>
                    )}
                  </div>
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
