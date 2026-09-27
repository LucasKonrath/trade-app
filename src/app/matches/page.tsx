import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { findMatches, getCardsByIds } from "@/lib/queries";
import { CardTile } from "@/components/card-tile";
import { ProposeTradeButton } from "./propose-button";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  if (!session.user.handle) redirect("/onboarding");

  const matches = await findMatches(session.user.id);

  const allCardIds = new Set<string>();
  for (const m of matches) {
    m.theyWantIds.forEach((id) => allCardIds.add(id));
    m.iWantIds.forEach((id) => allCardIds.add(id));
  }
  const cards = await getCardsByIds([...allCardIds]);
  const cardById = new Map(cards.map((c) => [c.id, c]));

  return (
    <section className="section">
      <div className="container">
        <h1 className="title is-3">Matches</h1>
        <p className="subtitle is-6 has-text-grey">
          Players who want cards you have and have cards you want.
        </p>

        {matches.length === 0 ? (
          <div className="notification is-light has-text-centered">
            No matches yet. Add cards to your{" "}
            <Link href="/me/listings" className="has-text-link">
              HAVE and WANT lists
            </Link>
            .
          </div>
        ) : (
          <div>
            {matches.map((m) => (
              <div key={m.userId} className="box mb-5">
                <div className="level match-header mb-4">
                  <div className="level-left">
                    <div className="level-item">
                      {m.image && (
                        <figure className="image is-32x32 mr-3">
                          <Image
                            src={m.image}
                            alt=""
                            width={32}
                            height={32}
                            style={{ borderRadius: "9999px" }}
                          />
                        </figure>
                      )}
                      <div>
                        <Link
                          href={m.handle ? `/u/${m.handle}` : "#"}
                          className="has-text-weight-semibold"
                        >
                          {m.handle ? `@${m.handle}` : m.name ?? "unnamed"}
                        </Link>
                        <div className="is-size-7 has-text-grey">
                          {m.theyWantIds.length} card{m.theyWantIds.length === 1 ? "" : "s"} you have they want ·{" "}
                          {m.iWantIds.length} card{m.iWantIds.length === 1 ? "" : "s"} they have you want
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="level-right">
                    <ProposeTradeButton
                      responderId={m.userId}
                      iGiveIds={m.theyWantIds}
                      iReceiveIds={m.iWantIds}
                    />
                  </div>
                </div>

                <div className="columns">
                  <div className="column">
                    <h3 className="subtitle is-6">You give →</h3>
                    <div className="columns is-mobile is-multiline is-variable is-2">
                      {m.theyWantIds.map((id) => {
                        const c = cardById.get(id);
                        if (!c) return null;
                        return (
                          <div key={id} className="column is-one-third-desktop is-half-tablet is-half-mobile">
                            <CardTile
                              name={c.name}
                              imageUrl={c.imageUrl}
                              setName={c.set.name}
                              number={c.number}
                              rarity={c.rarity}
                              gameSlug={c.game.slug}
                              orientation={c.orientation}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="column">
                    <h3 className="subtitle is-6">← You receive</h3>
                    <div className="columns is-mobile is-multiline is-variable is-2">
                      {m.iWantIds.map((id) => {
                        const c = cardById.get(id);
                        if (!c) return null;
                        return (
                          <div key={id} className="column is-one-third-desktop is-half-tablet is-half-mobile">
                            <CardTile
                              name={c.name}
                              imageUrl={c.imageUrl}
                              setName={c.set.name}
                              number={c.number}
                              rarity={c.rarity}
                              gameSlug={c.game.slug}
                              orientation={c.orientation}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
