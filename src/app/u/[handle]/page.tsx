import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { CardTile } from "@/components/card-tile";
import { ProposeListingButton } from "@/components/propose-listing-button";
import { ENABLED_GAMES } from "@/lib/config";
import { formatBRL } from "@/lib/money";
import type { ListingKind, OfferType } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { handle },
    select: {
      id: true,
      handle: true,
      name: true,
      image: true,
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
                {haves.length} HAVE · {wants.length} WANT
              </p>
            </div>
          </div>
        </div>

        <Section title="HAVE" tone="is-success" listings={haves} canPropose={!!canPropose} ownerId={user.id} />
        <Section title="WANT" tone="is-warning" listings={wants} canPropose={!!canPropose} ownerId={user.id} />
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
}) {
  return (
    <div className="mb-6">
      <h2 className="title is-5 mb-3">
        <span className={`tag ${tone} mr-2`}>{title}</span>
        <span className="has-text-grey is-size-6">({listings.length})</span>
      </h2>
      {listings.length === 0 ? (
        <div className="has-text-grey is-italic is-size-7">None listed.</div>
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
                footer={
                  <div className="is-size-7">
                    <div className="has-text-grey">
                      Qty {l.quantity}
                      {l.condition ? ` · ${l.condition}` : ""}
                    </div>
                    {l.priceCents !== null && (
                      <div className="mt-1">
                        <span className="tag is-primary is-small">
                          {formatBRL(l.priceCents)}
                          {l.offerType === "CASH_ONLY" ? " · cash only" : ""}
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
