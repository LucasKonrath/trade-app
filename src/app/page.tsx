import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import {
  getRecentListings,
  getRecentFinishedTrades,
  getCommunityStats,
} from "@/lib/queries";
import { CardTile } from "@/components/card-tile";
import { formatBRL } from "@/lib/money";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [session, { t, locale }] = await Promise.all([auth(), getT()]);
  const viewerId = session?.user?.id ?? null;

  const [listings, trades, stats] = await Promise.all([
    getRecentListings(viewerId, 12),
    getRecentFinishedTrades(viewerId, 5),
    getCommunityStats(viewerId),
  ]);

  return (
    <>
      {/* Hero — full-size when signed out, compact when signed in */}
      <section
        className={`hero brand-hero ${session?.user ? "is-small" : "is-medium"}`}
      >
        <div className="hero-body">
          <div className="container">
            {session?.user ? (
              <>
                <h1 className="title is-3">
                  {t("home.welcomeBack", { handle: session.user.handle ?? "" })}
                </h1>
                <p className="subtitle is-6">{t("home.welcomeSubtitle")}</p>
              </>
            ) : (
              <>
                <h1 className="title is-2">{t("landing.heading")}</h1>
                <p className="subtitle is-5 mt-4">{t("landing.subheading")}</p>
                <div className="buttons mt-5">
                  <Link href="/signin" className="button is-primary is-medium">
                    {t("landing.signInToStart")}
                  </Link>
                  <Link href="/cards" className="button is-light is-medium">
                    {t("landing.browseCards")}
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {/* Community stats bar */}
          <div className="columns is-mobile is-multiline">
            <StatColumn value={stats.traders} label={t("home.statTraders")} />
            <StatColumn
              value={stats.activeListings}
              label={t("home.statListings")}
            />
            <StatColumn
              value={stats.tradesThisWeek}
              label={t("home.statTradesWeek")}
            />
          </div>

          {/* Latest listings */}
          <div className="mt-6">
            <div className="level is-mobile mb-3">
              <div className="level-left">
                <h2 className="title is-5 mb-0">{t("home.latestListings")}</h2>
              </div>
              <div className="level-right">
                <Link href="/browse" className="is-size-7">
                  {t("home.seeAll")} →
                </Link>
              </div>
            </div>
            {listings.length === 0 ? (
              <div className="notification is-light">
                {t("home.noListingsYet")}{" "}
                <Link href="/cards" className="has-text-link">
                  {t("home.browseCatalog")}
                </Link>
              </div>
            ) : (
              <div className="columns is-mobile is-multiline is-variable is-3">
                {listings.map((l) => (
                  <div
                    key={l.id}
                    className="column is-2-desktop is-one-third-tablet is-half-mobile"
                  >
                    <CardTile
                      name={l.card.name}
                      imageUrl={l.card.imageUrl}
                      setName={l.card.set.name}
                      number={l.card.number}
                      rarity={l.card.rarity}
                      gameSlug={l.card.game.slug}
                      orientation={l.card.orientation}
                      href={`/cards/${l.card.id}`}
                      footer={
                        <div>
                          <div className="tags are-small mb-1" style={{ gap: "0.25rem" }}>
                            <span
                              className={`tag is-small ${l.kind === "HAVE" ? "is-success" : "is-warning"}`}
                            >
                              {l.kind}
                            </span>
                            {l.priceCents !== null && (
                              <span className="tag is-small is-primary">
                                {formatBRL(l.priceCents)}
                                {l.quantity > 1 ? ` ${t("common.perUnit")}` : ""}
                              </span>
                            )}
                            {l.quantity > 1 && (
                              <span className="tag is-small is-light">×{l.quantity}</span>
                            )}
                          </div>
                          <Link
                            href={l.user.handle ? `/u/${l.user.handle}` : "#"}
                            className="has-text-grey is-size-7"
                          >
                            {l.user.handle ? `@${l.user.handle}` : l.user.name ?? "?"}
                          </Link>
                        </div>
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent trades */}
          {trades.length > 0 && (
            <div className="mt-6">
              <div className="level is-mobile mb-3">
                <div className="level-left">
                  <h2 className="title is-5 mb-0">{t("home.recentTrades")}</h2>
                </div>
                {session?.user && (
                  <div className="level-right">
                    <Link href="/trades" className="is-size-7">
                      {t("home.seeAll")} →
                    </Link>
                  </div>
                )}
              </div>
              <div className="listing-rows">
                {trades.map((tr) => (
                  <TradeRow key={tr.id} trade={tr} locale={locale} t={t} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function StatColumn({ value, label }: { value: number; label: string }) {
  return (
    <div className="column is-one-third">
      <div className="box has-text-centered">
        <div
          className="title is-3 mb-1"
          style={{ fontFamily: "var(--mul-font-display)" }}
        >
          {value.toLocaleString()}
        </div>
        <div className="has-text-grey is-size-7">{label}</div>
      </div>
    </div>
  );
}

type TradeRowTrade = Awaited<ReturnType<typeof getRecentFinishedTrades>>[number];

function TradeRow({
  trade,
  locale,
  t,
}: {
  trade: TradeRowTrade;
  locale: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const cash = trade.cashCents;
  const when = trade.finishedAt
    ? new Date(trade.finishedAt).toLocaleDateString(locale, {
        day: "2-digit",
        month: "short",
      })
    : "";
  const cardCount = trade.items.length;

  return (
    <div className="box listing-row mb-2">
      <div className="listing-row-main">
        <div className="listing-row-user">
          <div
            className="is-flex is-align-items-center"
            style={{ gap: "0.5rem", flexWrap: "wrap" }}
          >
            <UserChip user={trade.requester} />
            <span className="has-text-grey">↔</span>
            <UserChip user={trade.responder} />
          </div>
          <div className="listing-row-meta mt-2">
            <span className="tag is-small is-success is-light">
              {t("home.tradeFinishedTag")}
            </span>
            <span className="has-text-grey is-size-7">
              {t("home.tradeCards", { count: cardCount })}
            </span>
            {cash != null && cash !== 0 && (
              <span className="tag is-small is-primary is-light">
                {formatBRL(Math.abs(cash))}
              </span>
            )}
            <span className="has-text-grey is-size-7">{when}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserChip({
  user,
}: {
  user: { handle: string | null; name: string | null; image: string | null };
}) {
  return (
    <Link
      href={user.handle ? `/u/${user.handle}` : "#"}
      className="is-flex is-align-items-center"
      style={{ gap: "0.35rem", color: "inherit" }}
    >
      {user.image && (
        <Image
          src={user.image}
          alt=""
          width={20}
          height={20}
          style={{ borderRadius: "9999px" }}
        />
      )}
      <span className="has-text-weight-semibold is-size-7">
        {user.handle ? `@${user.handle}` : user.name ?? "?"}
      </span>
    </Link>
  );
}
