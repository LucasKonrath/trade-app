import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMyPendingDeliveries, type DeliveryTrade } from "@/lib/queries";
import { getT } from "@/lib/i18n/server";
import { formatBRL } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function DeliveriesPage() {
  const [session, { t, locale }] = await Promise.all([auth(), getT()]);
  if (!session?.user) redirect("/signin");
  if (!session.user.handle) redirect("/onboarding");

  const groups = await getMyPendingDeliveries(session.user.id);
  const totalTrades = groups.reduce((s, g) => s + g.trades.length, 0);

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 900 }}>
        <h1 className="title is-3">{t("deliveries.title")}</h1>
        <p className="subtitle is-6 has-text-grey">
          {groups.length === 0
            ? t("deliveries.emptySubtitle")
            : t("deliveries.summary", {
                trades: totalTrades,
                people: groups.length,
              })}
        </p>

        {groups.length === 0 ? (
          <div className="notification is-light">
            {t("deliveries.empty")}{" "}
            <Link href="/trades" className="has-text-link">
              {t("deliveries.seeTrades")} →
            </Link>
          </div>
        ) : (
          <div>
            {groups.map((g) => (
              <div key={g.counterparty.id} className="box mb-4">
                {/* Counterparty header */}
                <div className="level is-mobile mb-3">
                  <div className="level-left">
                    <div className="level-item">
                      {g.counterparty.image && (
                        <Image
                          src={g.counterparty.image}
                          alt=""
                          width={40}
                          height={40}
                          style={{ borderRadius: "9999px", marginRight: "0.75rem" }}
                        />
                      )}
                      <div>
                        <Link
                          href={
                            g.counterparty.handle ? `/u/${g.counterparty.handle}` : "#"
                          }
                          className="title is-6 mb-0"
                        >
                          {g.counterparty.handle
                            ? `@${g.counterparty.handle}`
                            : g.counterparty.name ?? "?"}
                        </Link>
                        <div className="is-size-7 has-text-grey">
                          {t("deliveries.perCounterparty", {
                            trades: g.trades.length,
                            give: g.totalCardsIGive,
                            receive: g.totalCardsIReceive,
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                  {g.netCashOwedByMe !== 0 && (
                    <div className="level-right">
                      <span
                        className={`tag is-medium ${g.netCashOwedByMe > 0 ? "is-warning" : "is-success"}`}
                      >
                        {g.netCashOwedByMe > 0
                          ? t("deliveries.iOweThem", {
                              amount: formatBRL(Math.abs(g.netCashOwedByMe)),
                            })
                          : t("deliveries.theyOweMe", {
                              amount: formatBRL(Math.abs(g.netCashOwedByMe)),
                            })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Per-trade breakdown */}
                {g.trades.map((tr) => (
                  <TradeRow key={tr.id} trade={tr} locale={locale} t={t} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function TradeRow({
  trade,
  locale,
  t,
}: {
  trade: DeliveryTrade;
  locale: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const when = new Date(trade.updatedAt).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
  });

  return (
    <div
      className="box mb-2"
      style={{ background: "var(--mul-bg-elev-2)", padding: "0.75rem" }}
    >
      <div className="is-flex is-justify-content-space-between mb-2 is-align-items-center">
        <span className="is-size-7 has-text-grey">
          {t("deliveries.tradeUpdated", { date: when })}
        </span>
        <Link href={`/trades/${trade.id}`} className="button is-small is-light">
          {t("deliveries.openTrade")}
        </Link>
      </div>

      <div className="columns is-mobile is-gapless">
        <div className="column">
          <div className="is-size-7 has-text-grey mb-2">
            {t("deliveries.youDeliver")}
          </div>
          {trade.iGive.length === 0 ? (
            <div className="is-size-7 has-text-grey-light is-italic">
              {trade.cashOwedByMe > 0
                ? t("deliveries.justCash", { amount: formatBRL(trade.cashOwedByMe) })
                : t("deliveries.nothing")}
            </div>
          ) : (
            <CardStrip items={trade.iGive} />
          )}
        </div>
        <div
          className="column is-narrow is-flex is-align-items-center"
          style={{ padding: "0 0.5rem" }}
        >
          <span className="has-text-grey">↔</span>
        </div>
        <div className="column">
          <div className="is-size-7 has-text-grey mb-2">
            {t("deliveries.youReceive")}
          </div>
          {trade.iReceive.length === 0 ? (
            <div className="is-size-7 has-text-grey-light is-italic">
              {trade.cashOwedByMe < 0
                ? t("deliveries.justCash", {
                    amount: formatBRL(Math.abs(trade.cashOwedByMe)),
                  })
                : t("deliveries.nothing")}
            </div>
          ) : (
            <CardStrip items={trade.iReceive} />
          )}
        </div>
      </div>

      {trade.cashOwedByMe !== 0 && (trade.iGive.length > 0 || trade.iReceive.length > 0) && (
        <div className="is-size-7 mt-2 has-text-grey">
          {trade.cashOwedByMe > 0
            ? t("deliveries.plusCashYouOwe", { amount: formatBRL(trade.cashOwedByMe) })
            : t("deliveries.plusCashOwedToYou", {
                amount: formatBRL(Math.abs(trade.cashOwedByMe)),
              })}
        </div>
      )}
    </div>
  );
}

function CardStrip({ items }: { items: DeliveryTrade["iGive"] }) {
  return (
    <div className="is-flex" style={{ gap: "0.35rem", flexWrap: "wrap" }}>
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/cards/${item.card.id}`}
          className="card-thumb"
          title={item.card.name}
        >
          <div
            className="card-thumb-image"
            style={{
              width: 44,
              height: item.card.orientation === "landscape" ? 30 : 60,
              position: "relative",
              borderRadius: 4,
              overflow: "hidden",
              background: "hsl(219, 40%, 5%)",
              border: "1px solid var(--mul-border)",
            }}
          >
            {item.card.imageUrl ? (
              <Image
                src={item.card.imageUrl}
                alt={item.card.name}
                fill
                sizes="44px"
                style={{ objectFit: "cover" }}
              />
            ) : null}
            {item.quantity > 1 && (
              <span
                style={{
                  position: "absolute",
                  bottom: 1,
                  right: 1,
                  background: "var(--mul-orange)",
                  color: "hsl(219, 42%, 8%)",
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  padding: "0 3px",
                  borderRadius: 3,
                }}
              >
                ×{item.quantity}
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
