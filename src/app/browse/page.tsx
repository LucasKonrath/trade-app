import Link from "next/link";
import { auth } from "@/auth";
import { browseListings } from "@/lib/queries";
import { CardTile } from "@/components/card-tile";
import { ProposeListingButton } from "@/components/propose-listing-button";
import { GameSlug, ListingKind } from "@prisma/client";
import { ENABLED_GAMES, IS_MULTI_GAME } from "@/lib/config";
import { formatBRL } from "@/lib/money";
import type { ListingIntent } from "@/lib/queries";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string; game?: string; kind?: string; intent?: string; page?: string };

const PAGE_SIZE = 48;

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const game = (params.game as GameSlug | undefined) ?? undefined;
  const kind = (params.kind as ListingKind | undefined) ?? undefined;
  const intent = (params.intent as ListingIntent | undefined) ?? undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const session = await auth();

  const { items, total } = await browseListings({
    q,
    game,
    kind,
    intent,
    excludeUserId: session?.user?.id,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="section">
      <div className="container">
        <h1 className="title is-3">Browse listings</h1>
        <p className="subtitle is-6 has-text-grey">
          What everyone else at the LGS is trading.
        </p>

        <form action="/browse" className="filter-row field is-grouped is-align-items-center mb-5">
          <div className="control is-expanded" style={{ maxWidth: 320 }}>
            <input
              name="q"
              defaultValue={q}
              placeholder="Search cards…"
              className="input"
            />
          </div>
          {IS_MULTI_GAME && (
            <div className="control">
              <div className="select">
                <select name="game" defaultValue={game ?? ""}>
                  <option value="">All games</option>
                  {ENABLED_GAMES.includes(GameSlug.pokemon) && <option value="pokemon">Pokémon</option>}
                  {ENABLED_GAMES.includes(GameSlug.riftbound) && <option value="riftbound">Riftbound</option>}
                </select>
              </div>
            </div>
          )}
          <div className="control">
            <div className="select">
              <select name="kind" defaultValue={kind ?? ""}>
                <option value="">HAVE and WANT</option>
                <option value="HAVE">HAVE only</option>
                <option value="WANT">WANT only</option>
              </select>
            </div>
          </div>
          <div className="control">
            <div className="select">
              <select name="intent" defaultValue={intent ?? ""}>
                <option value="">Any offer</option>
                <option value="TRADE">Trade</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
          </div>
          <div className="control">
            <button className="button is-primary">Filter</button>
          </div>
          <div className="control is-flex-grow-1 has-text-right">
            <span className="tag is-light">{total.toLocaleString()} listings</span>
          </div>
        </form>

        {items.length === 0 ? (
          <div className="notification is-light has-text-centered">
            Nothing here yet. Be the first to post!{" "}
            <Link href="/cards" className="has-text-link">
              Browse the catalog →
            </Link>
          </div>
        ) : (
          <div className="columns is-mobile is-multiline is-variable is-3">
            {items.map((l) => (
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
                    <div>
                      <div className="tags are-small mb-1" style={{ gap: "0.25rem" }}>
                        <span
                          className={`tag ${l.kind === "HAVE" ? "is-success" : "is-warning"} is-small`}
                        >
                          {l.kind} · qty {l.quantity}
                          {l.condition ? ` · ${l.condition}` : ""}
                        </span>
                        {l.priceCents !== null && (
                          <span className="tag is-primary is-small">
                            {formatBRL(l.priceCents)}
                            {l.offerType === "CASH_ONLY" ? " · cash only" : ""}
                          </span>
                        )}
                      </div>
                      <Link
                        href={l.user.handle ? `/u/${l.user.handle}` : "#"}
                        className="has-text-grey is-size-7"
                      >
                        {l.user.handle ? `@${l.user.handle}` : l.user.name ?? "unnamed"}
                      </Link>
                      {l.note && (
                        <div className="is-size-7 has-text-grey mt-1 mb-1" style={{ lineHeight: 1.3 }}>
                          {l.note}
                        </div>
                      )}
                      <div className="mt-2">
                        {session?.user ? (
                          <ProposeListingButton
                            ownerId={l.userId}
                            cardId={l.cardId}
                            kind={l.kind}
                            offerType={l.offerType}
                            priceCents={l.priceCents}
                          />
                        ) : (
                          <Link href="/signin" className="button is-small is-light is-fullwidth">
                            Sign in to propose
                          </Link>
                        )}
                      </div>
                    </div>
                  }
                />
              </div>
            ))}
          </div>
        )}

        {pages > 1 && (
          <nav className="pagination is-centered mt-5" role="navigation">
            {page > 1 ? (
              <Link
                href={{ pathname: "/browse", query: { q, game, kind, intent, page: page - 1 } }}
                className="pagination-previous"
              >
                Previous
              </Link>
            ) : (
              <span className="pagination-previous" aria-disabled>
                Previous
              </span>
            )}
            {page < pages ? (
              <Link
                href={{ pathname: "/browse", query: { q, game, kind, intent, page: page + 1 } }}
                className="pagination-next"
              >
                Next
              </Link>
            ) : (
              <span className="pagination-next" aria-disabled>
                Next
              </span>
            )}
            <ul className="pagination-list">
              <li>
                <span className="pagination-link is-current">
                  Page {page} of {pages}
                </span>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </section>
  );
}
