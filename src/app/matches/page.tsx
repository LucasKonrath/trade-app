import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { findMatches, findCashMatches, getCardsByIds } from "@/lib/queries";
import { CardTile } from "@/components/card-tile";
import { ProposeTradeButton } from "./propose-button";
import { ProposeListingButton } from "@/components/propose-listing-button";
import { ScopeToggle } from "@/components/scope-toggle";
import { formatBRL } from "@/lib/money";
import { getT } from "@/lib/i18n/server";
import { parseLgsScope } from "@/lib/lgs";

export const dynamic = "force-dynamic";

type SearchParams = { scope?: string };

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [session, { t }, params] = await Promise.all([auth(), getT(), searchParams]);
  if (!session?.user) redirect("/signin");
  if (!session.user.handle) redirect("/onboarding");
  const scope = parseLgsScope(params.scope);

  const [matches, cashMatches] = await Promise.all([
    findMatches(session.user.id, scope),
    findCashMatches(session.user.id, scope),
  ]);

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
        <h1 className="title is-3">{t("matches.title")}</h1>
        <p className="subtitle is-6 has-text-grey">{t("matches.subtitle")}</p>

        <ScopeToggle pathname="/matches" scope={scope} currentQuery={{}} />

        <h2 className="title is-5 mt-5">
          <span className="tag is-info mr-2">{t("matches.cashTagLabel")}</span>
          {t("matches.cashSectionTitle")}
          <span className="has-text-grey is-size-6 ml-2">({cashMatches.length})</span>
        </h2>
        {cashMatches.length === 0 ? (
          <div className="notification is-light">{t("matches.cashEmpty")}</div>
        ) : (
          <div className="mb-6">
            {cashMatches.map((m) => (
              <div key={m.card.id} className="box mb-4">
                <div className="columns is-mobile">
                  <div className="column is-one-third-tablet is-one-quarter-desktop is-half-mobile">
                    <CardTile
                      name={m.card.name}
                      imageUrl={m.card.imageUrl}
                      setName={m.card.set.name}
                      number={m.card.number}
                      rarity={m.card.rarity}
                      gameSlug={m.card.game.slug}
                      orientation={m.card.orientation}
                      href={`/cards/${m.card.id}`}
                    />
                  </div>
                  <div className="column">
                    <p className="is-size-7 has-text-grey mb-3">
                      {t("matches.yourMax")} <strong>{formatBRL(m.myMaxCents)}</strong>
                    </p>
                    <div className="table-container">
                      <table className="table is-fullwidth is-narrow is-hoverable">
                        <thead>
                          <tr>
                            <th>{t("matches.seller")}</th>
                            <th>{t("matches.price")}</th>
                            <th>{t("matches.condition")}</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {m.sellers.map((s) => (
                            <tr key={s.listingId}>
                              <td>
                                <Link
                                  href={s.handle ? `/u/${s.handle}` : "#"}
                                  className="has-text-weight-semibold"
                                >
                                  {s.handle ? `@${s.handle}` : s.name ?? "unnamed"}
                                </Link>
                              </td>
                              <td>
                                <span className="tag is-primary is-light">
                                  {formatBRL(s.priceCents)}
                                </span>
                              </td>
                              <td className="has-text-grey is-size-7">{s.condition ?? "—"}</td>
                              <td>
                                <ProposeListingButton
                                  ownerId={s.userId}
                                  cardId={m.card.id}
                                  kind="HAVE"
                                  offerType={s.offerType}
                                  priceCents={s.priceCents}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 className="title is-5 mt-6">
          <span className="tag is-warning mr-2">{t("matches.tradeTagLabel")}</span>
          {t("matches.tradeSectionTitle")}
          <span className="has-text-grey is-size-6 ml-2">({matches.length})</span>
        </h2>

        {matches.length === 0 ? (
          <div className="notification is-light">
            {t("matches.tradeEmpty")}{" "}
            <Link href="/me/listings" className="has-text-link">
              {t("myListings.title")}
            </Link>
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
                          {t("matches.cardsYouHaveTheyWant", {
                            count: m.theyWantIds.length,
                            plural: m.theyWantIds.length === 1 ? "" : "s",
                            countB: m.iWantIds.length,
                            pluralB: m.iWantIds.length === 1 ? "" : "s",
                          })}
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
                    <h3 className="subtitle is-6">{t("matches.youGive")}</h3>
                    <div className="columns is-mobile is-multiline is-variable is-2">
                      {m.theyWantIds.map((id) => {
                        const c = cardById.get(id);
                        if (!c) return null;
                        return (
                          <div
                            key={id}
                            className="column is-one-third-desktop is-half-tablet is-half-mobile"
                          >
                            <CardTile
                              name={c.name}
                              imageUrl={c.imageUrl}
                              setName={c.set.name}
                              number={c.number}
                              rarity={c.rarity}
                              gameSlug={c.game.slug}
                              orientation={c.orientation}
                              href={`/cards/${c.id}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="column">
                    <h3 className="subtitle is-6">{t("matches.youReceive")}</h3>
                    <div className="columns is-mobile is-multiline is-variable is-2">
                      {m.iWantIds.map((id) => {
                        const c = cardById.get(id);
                        if (!c) return null;
                        return (
                          <div
                            key={id}
                            className="column is-one-third-desktop is-half-tablet is-half-mobile"
                          >
                            <CardTile
                              name={c.name}
                              imageUrl={c.imageUrl}
                              setName={c.set.name}
                              number={c.number}
                              rarity={c.rarity}
                              gameSlug={c.game.slug}
                              orientation={c.orientation}
                              href={`/cards/${c.id}`}
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
