import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { searchCards } from "@/lib/queries";
import { CardTile } from "@/components/card-tile";
import { ListToggle } from "@/components/list-toggle";
import { GameSlug } from "@prisma/client";
import { ENABLED_GAMES, IS_MULTI_GAME } from "@/lib/config";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string; game?: string; page?: string };

const PAGE_SIZE = 48;

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const game = (params.game as GameSlug | undefined) ?? undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const session = await auth();

  const { items, total } = await searchCards({
    q,
    game,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  const myListings = session?.user
    ? await prisma.listing.findMany({
        where: { userId: session.user.id, cardId: { in: items.map((c) => c.id) } },
        select: { id: true, cardId: true, kind: true, quantity: true },
      })
    : [];

  const byCard = new Map<
    string,
    { HAVE?: { id: string; quantity: number }; WANT?: { id: string; quantity: number } }
  >();
  for (const l of myListings) {
    const bucket = byCard.get(l.cardId) ?? {};
    bucket[l.kind] = { id: l.id, quantity: l.quantity };
    byCard.set(l.cardId, bucket);
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="section">
      <div className="container">
        <h1 className="title is-3">Cards</h1>
        <p className="subtitle is-6 has-text-grey">
          Search the catalog and mark cards as HAVE or WANT.
        </p>

        <form action="/cards" className="filter-row field is-grouped is-align-items-center mb-5">
          <div className="control is-expanded" style={{ maxWidth: 320 }}>
            <input
              name="q"
              defaultValue={q}
              placeholder="Search by name…"
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
            <button className="button is-primary">Search</button>
          </div>
          <div className="control is-flex-grow-1 has-text-right">
            <span className="tag is-light">{total.toLocaleString()} cards</span>
          </div>
        </form>

        {items.length === 0 ? (
          <div className="notification is-light has-text-centered">
            No cards match. Try a different search.
          </div>
        ) : (
          <div className="columns is-mobile is-multiline is-variable is-3">
            {items.map((c) => {
              const state = byCard.get(c.id) ?? {};
              return (
                <div key={c.id} className="column is-2-desktop is-one-third-tablet is-half-mobile">
                  <CardTile
                    name={c.name}
                    imageUrl={c.imageUrl}
                    setName={c.set.name}
                    number={c.number}
                    rarity={c.rarity}
                    gameSlug={c.game.slug}
                    orientation={c.orientation}
                    footer={
                      session?.user ? (
                        <div className="buttons are-small mb-0" style={{ gap: "0.375rem" }}>
                          <div style={{ width: "100%" }}>
                            <ListToggle cardId={c.id} existing={state.HAVE ?? null} kind="HAVE" />
                          </div>
                          <div style={{ width: "100%" }}>
                            <ListToggle cardId={c.id} existing={state.WANT ?? null} kind="WANT" />
                          </div>
                        </div>
                      ) : (
                        <Link href="/signin" className="button is-light is-small is-fullwidth">
                          Sign in to list
                        </Link>
                      )
                    }
                  />
                </div>
              );
            })}
          </div>
        )}

        {pages > 1 && (
          <nav className="pagination is-centered mt-5" role="navigation">
            {page > 1 ? (
              <Link
                href={{ pathname: "/cards", query: { q, game, page: page - 1 } }}
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
                href={{ pathname: "/cards", query: { q, game, page: page + 1 } }}
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
