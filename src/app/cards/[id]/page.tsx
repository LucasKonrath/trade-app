import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getCardWithListings } from "@/lib/queries";
import { CardTile } from "@/components/card-tile";
import { ProposeListingButton } from "@/components/propose-listing-button";
import { PriceChip } from "@/components/price-chip";
import { ListToggle } from "@/components/list-toggle";
import { formatBRL } from "@/lib/money";
import { getT } from "@/lib/i18n/server";
import type { ListingKind } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, { t }] = await Promise.all([auth(), getT()]);
  const data = await getCardWithListings(id, session?.user?.id);
  if (!data) notFound();

  const { card, mine, sellers, buyers } = data;
  const myHave = mine.find((l) => l.kind === "HAVE") ?? null;
  const myWant = mine.find((l) => l.kind === "WANT") ?? null;

  return (
    <section className="section">
      <div className="container">
        <nav className="breadcrumb is-small mb-4">
          <ul>
            <li>
              <Link href="/cards">{t("cardDetail.breadcrumb")}</Link>
            </li>
            <li className="is-active">
              <a>{card.name}</a>
            </li>
          </ul>
        </nav>

        <div className="columns">
          <div className="column is-one-third-tablet is-one-quarter-desktop">
            <CardTile
              name={card.name}
              imageUrl={card.imageUrl}
              setName={card.set.name}
              number={card.number}
              rarity={card.rarity}
              gameSlug={card.game.slug}
              orientation={card.orientation}
            />
          </div>

          <div className="column">
            <h1 className="title is-3">{card.name}</h1>
            <p className="subtitle is-6 has-text-grey">
              {card.set.name} · #{card.number ?? "?"}
              {card.rarity ? ` · ${card.rarity}` : ""} · {card.game.name}
            </p>

            {session?.user && (
              <div className="box mt-4">
                <h3 className="title is-6 mb-3">{t("cardDetail.yourListings")}</h3>
                <div className="columns is-mobile">
                  <div className="column">
                    <p className="is-size-7 has-text-grey mb-1">{t("cardDetail.have")}</p>
                    <ListToggle
                      cardId={card.id}
                      existing={myHave ? { id: myHave.id, quantity: myHave.quantity } : null}
                      kind="HAVE"
                    />
                    <div className="mt-2">
                      <PriceChip
                        cardId={card.id}
                        kind="HAVE"
                        currentPriceCents={myHave?.priceCents ?? null}
                      />
                    </div>
                  </div>
                  <div className="column">
                    <p className="is-size-7 has-text-grey mb-1">{t("cardDetail.want")}</p>
                    <ListToggle
                      cardId={card.id}
                      existing={myWant ? { id: myWant.id, quantity: myWant.quantity } : null}
                      kind="WANT"
                    />
                    <div className="mt-2">
                      <PriceChip
                        cardId={card.id}
                        kind="WANT"
                        currentPriceCents={myWant?.priceCents ?? null}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <ListingsSection
          title={t("cardDetail.sellers")}
          tone="is-success"
          empty={t("cardDetail.nobodyListed")}
          tradeOnlyLabel={t("cardDetail.tradeOnly")}
          cashLabel={t("cardDetail.cash")}
          listings={sellers}
          kind="HAVE"
          canPropose={!!session?.user}
          cardId={card.id}
        />
        <ListingsSection
          title={t("cardDetail.wantedBy")}
          tone="is-warning"
          empty={t("cardDetail.noOneLooking")}
          tradeOnlyLabel={t("cardDetail.tradeOnly")}
          cashLabel={t("cardDetail.cash")}
          listings={buyers}
          kind="WANT"
          canPropose={!!session?.user}
          cardId={card.id}
        />
      </div>
    </section>
  );
}

type ListingRow = {
  id: string;
  userId: string;
  kind: ListingKind;
  quantity: number;
  condition: string | null;
  note: string | null;
  offerType: "TRADE_ONLY" | "CASH_ONLY" | "TRADE_OR_CASH";
  priceCents: number | null;
  user: { id: string; handle: string | null; name: string | null; image: string | null };
};

function ListingsSection({
  title,
  tone,
  empty,
  tradeOnlyLabel,
  cashLabel,
  listings,
  kind,
  canPropose,
  cardId,
}: {
  title: string;
  tone: string;
  empty: string;
  tradeOnlyLabel: string;
  cashLabel: string;
  listings: ListingRow[];
  kind: ListingKind;
  canPropose: boolean;
  cardId: string;
}) {
  return (
    <div className="mt-6">
      <h2 className="title is-5">
        <span className={`tag ${tone} mr-2`}>{title}</span>
        <span className="has-text-grey is-size-6">({listings.length})</span>
      </h2>
      {listings.length === 0 ? (
        <div className="notification is-light">{empty}</div>
      ) : (
        <div className="listing-rows">
          {listings.map((l) => (
            <div key={l.id} className="box listing-row mb-2">
              <div className="listing-row-main">
                <div className="listing-row-user">
                  {l.user.image && (
                    <Image
                      src={l.user.image}
                      alt=""
                      width={28}
                      height={28}
                      style={{ borderRadius: "9999px" }}
                    />
                  )}
                  <div>
                    <Link
                      href={l.user.handle ? `/u/${l.user.handle}` : "#"}
                      className="has-text-weight-semibold"
                    >
                      {l.user.handle ? `@${l.user.handle}` : l.user.name ?? "unnamed"}
                    </Link>
                    <div className="listing-row-meta">
                      {l.priceCents != null ? (
                        <span className="tag is-small is-primary is-light">
                          {formatBRL(l.priceCents)}
                          {l.offerType === "CASH_ONLY" ? ` · ${cashLabel}` : ""}
                        </span>
                      ) : (
                        <span className="tag is-small is-light">{tradeOnlyLabel}</span>
                      )}
                      <span className="has-text-grey is-size-7">
                        {l.condition ?? "—"} · qty {l.quantity}
                      </span>
                    </div>
                    {l.note && (
                      <div className="has-text-grey is-size-7 mt-1" style={{ lineHeight: 1.3 }}>
                        {l.note}
                      </div>
                    )}
                  </div>
                </div>
                {canPropose && (
                  <div className="listing-row-action">
                    <ProposeListingButton
                      ownerId={l.userId}
                      cardId={cardId}
                      kind={kind}
                      offerType={l.offerType}
                      priceCents={l.priceCents}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
