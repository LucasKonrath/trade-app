import Link from "next/link";
import { auth } from "@/auth";
import { browseListings } from "@/lib/queries";
import { CardTile } from "@/components/card-tile";
import { ProposeListingButton } from "@/components/propose-listing-button";
import { ScopeToggle } from "@/components/scope-toggle";
import { GameSlug, ListingKind } from "@prisma/client";
import { GAME_LABELS } from "@/lib/config";
import { getViewerGameSlugs } from "@/lib/games";
import { formatBRL } from "@/lib/money";
import { getT } from "@/lib/i18n/server";
import { parseLgsScope } from "@/lib/lgs";
import type { ListingIntent } from "@/lib/queries";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  game?: string;
  kind?: string;
  intent?: string;
  scope?: string;
  page?: string;
};

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
  const scope = parseLgsScope(params.scope);
  const page = Math.max(1, Number(params.page) || 1);

  const [session, { t }] = await Promise.all([auth(), getT()]);
  const viewerGames = await getViewerGameSlugs(session?.user?.id ?? null);
  const isMultiGame = viewerGames.length > 1;

  const { items, total } = await browseListings({
    q,
    game,
    kind,
    intent,
    excludeUserId: session?.user?.id,
    viewerId: session?.user?.id ?? null,
    scope,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="section">
      <div className="container">
        <h1 className="title is-3">{t("browse.title")}</h1>
        <p className="subtitle is-6 has-text-grey">{t("browse.subtitle")}</p>

        {session?.user && (
          <ScopeToggle
            pathname="/browse"
            scope={scope}
            currentQuery={{ q, game, kind, intent }}
          />
        )}

        <form action="/browse" className="filter-row field is-grouped is-align-items-center mb-5">
          <div className="control is-expanded" style={{ maxWidth: 320 }}>
            <input
              name="q"
              defaultValue={q}
              placeholder={t("browse.searchPlaceholder")}
              className="input"
            />
          </div>
          {isMultiGame && (
            <div className="control">
              <div className="select">
                <select name="game" defaultValue={game ?? ""}>
                  <option value="">{t("cards.allGames")}</option>
                  {viewerGames.map((slug) => (
                    <option key={slug} value={slug}>
                      {GAME_LABELS[slug]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div className="control">
            <div className="select">
              <select name="kind" defaultValue={kind ?? ""}>
                <option value="">{t("browse.haveAndWant")}</option>
                <option value="HAVE">{t("browse.haveOnly")}</option>
                <option value="WANT">{t("browse.wantOnly")}</option>
              </select>
            </div>
          </div>
          <div className="control">
            <div className="select">
              <select name="intent" defaultValue={intent ?? ""}>
                <option value="">{t("browse.anyOffer")}</option>
                <option value="TRADE">{t("browse.trade")}</option>
                <option value="CASH">{t("browse.cash")}</option>
              </select>
            </div>
          </div>
          <div className="control">
            <button className="button is-primary">{t("browse.filter")}</button>
          </div>
          <div className="control is-flex-grow-1 has-text-right">
            <span className="tag is-light">
              {t("browse.listingsCount", { count: total.toLocaleString() })}
            </span>
          </div>
        </form>

        {items.length === 0 ? (
          <div className="notification is-light has-text-centered">
            {t("browse.nothingYet")}{" "}
            <Link href="/cards" className="has-text-link">
              {t("browse.browseCatalog")}
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
                  href={`/cards/${l.cardId}`}
                  footer={
                    <div>
                      <div className="tags are-small mb-1" style={{ gap: "0.25rem" }}>
                        <span
                          className={`tag ${l.kind === "HAVE" ? "is-success" : "is-warning"} is-small`}
                        >
                          {l.kind === "HAVE" ? t("cardDetail.have") : t("cardDetail.want")} · {t("listingEditor.qtyPrefix")} {l.quantity}
                          {l.condition ? ` · ${l.condition}` : ""}
                        </span>
                        {l.priceCents !== null && (
                          <span className="tag is-primary is-small">
                            {formatBRL(l.priceCents)}
                            {l.quantity > 1 ? ` ${t("common.perUnit")}` : ""}
                            {l.offerType === "CASH_ONLY" ? ` · ${t("cardDetail.cash")}` : ""}
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
                        <div
                          className="is-size-7 has-text-grey mt-1 mb-1"
                          style={{ lineHeight: 1.3 }}
                        >
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
                          <Link
                            href="/signin"
                            className="button is-small is-light is-fullwidth"
                          >
                            {t("browse.signInToPropose")}
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
                {t("common.previous")}
              </Link>
            ) : (
              <span className="pagination-previous" aria-disabled>
                {t("common.previous")}
              </span>
            )}
            {page < pages ? (
              <Link
                href={{ pathname: "/browse", query: { q, game, kind, intent, page: page + 1 } }}
                className="pagination-next"
              >
                {t("common.next")}
              </Link>
            ) : (
              <span className="pagination-next" aria-disabled>
                {t("common.next")}
              </span>
            )}
            <ul className="pagination-list">
              <li>
                <span className="pagination-link is-current">
                  {t("cards.pageOf", { page, pages })}
                </span>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </section>
  );
}
