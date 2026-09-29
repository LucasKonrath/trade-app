import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getTradeForUser } from "@/lib/queries";
import { CardTile } from "@/components/card-tile";
import { TradeActions } from "./trade-actions";
import { CashEditor } from "./cash-editor";
import { TradeComments } from "./trade-comments";
import { formatBRL } from "@/lib/money";
import { getT } from "@/lib/i18n/server";
import { TradeStatus, TradeDirection } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<TradeStatus, string> = {
  OPEN: "is-light",
  REQUESTED: "is-info",
  ACCEPTED: "is-primary",
  FINISHED: "is-success",
};

export default async function TradePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [session, { t }] = await Promise.all([auth(), getT()]);
  if (!session?.user) redirect("/signin");
  if (!session.user.handle) redirect("/onboarding");

  const { id } = await params;
  const trade = await getTradeForUser(id, session.user.id);
  if (!trade) notFound();

  const iAmRequester = trade.requesterId === session.user.id;
  const other = iAmRequester ? trade.responder : trade.requester;

  const iGive = trade.items.filter((i) =>
    iAmRequester
      ? i.direction === TradeDirection.FROM_REQUESTER
      : i.direction === TradeDirection.FROM_RESPONDER,
  );
  const iReceive = trade.items.filter((i) =>
    iAmRequester
      ? i.direction === TradeDirection.FROM_RESPONDER
      : i.direction === TradeDirection.FROM_REQUESTER,
  );

  return (
    <section className="section">
      <div className="container">
        <nav className="breadcrumb is-small mb-4">
          <ul>
            <li>
              <Link href="/trades">{t("tradeDetail.breadcrumbTrades")}</Link>
            </li>
            <li className="is-active">
              <a>{trade.id.slice(0, 8)}</a>
            </li>
          </ul>
        </nav>

        <div className="box mb-5">
          <div className="level trade-header">
            <div className="level-left">
              <div className="level-item">
                {other.image && (
                  <figure className="image is-48x48 mr-3">
                    <Image
                      src={other.image}
                      alt=""
                      width={48}
                      height={48}
                      style={{ borderRadius: "9999px" }}
                    />
                  </figure>
                )}
                <div>
                  <div className="has-text-grey is-size-7">
                    {iAmRequester ? t("tradeDetail.tradingWith") : t("tradeDetail.tradingWithProposed")}
                  </div>
                  <Link
                    href={other.handle ? `/u/${other.handle}` : "#"}
                    className="title is-5 mb-0"
                  >
                    {other.handle ? `@${other.handle}` : other.name ?? "unnamed"}
                  </Link>
                </div>
              </div>
            </div>
            <div className="level-right">
              <span className={`tag is-large ${STATUS_TONE[trade.status]}`}>
                {t(`tradeStatus.${trade.status}`)}
              </span>
            </div>
          </div>
          <p className="has-text-grey is-size-7 mt-3 mb-0">
            {t(`tradeDetail.statusBlurb.${trade.status}`)}
          </p>

          {(() => {
            const cash = trade.cashCents;
            if (!cash) return null;
            const cashFromMe = iAmRequester ? cash < 0 : cash > 0;
            const amount = formatBRL(Math.abs(cash));
            const otherLabel = other.handle ? `@${other.handle}` : "";
            // Per-card breakdown: total copies across all trade items on the
            // side of the person receiving the cards (i.e. the side that's
            // paying).
            const totalCopies = trade.items.reduce(
              (sum, it) => sum + (it.quantity ?? 1),
              0,
            );
            const perCard =
              totalCopies > 1
                ? formatBRL(Math.round(Math.abs(cash) / totalCopies))
                : null;
            return (
              <div className="notification is-info is-light mt-3 mb-0 py-2 px-3">
                <strong>
                  {cashFromMe ? t("tradeDetail.youPay") : t("tradeDetail.youReceive")} {amount}
                </strong>{" "}
                {cashFromMe ? t("tradeDetail.to") : t("tradeDetail.from")} {otherLabel}
                {perCard && (
                  <span className="is-size-7 has-text-grey ml-2">
                    (≈ {perCard} {t("common.perUnit")} · {totalCopies} cartas)
                  </span>
                )}
              </div>
            );
          })()}

          {trade.status === "OPEN" && iAmRequester && (
            <div className="mt-3">
              <CashEditor tradeId={trade.id} cashCents={trade.cashCents} />
            </div>
          )}
        </div>

        <div className="columns">
          <div className="column">
            <h3 className="title is-6">
              <span className="tag is-warning mr-2">{t("tradeDetail.youGiveTag")}</span>
              <span className="has-text-grey is-size-6">({iGive.length})</span>
            </h3>
            {iGive.length === 0 ? (
              <div className="notification is-light">{t("tradeDetail.nothingOnSide")}</div>
            ) : (
              <div className="columns is-mobile is-multiline is-variable is-2">
                {iGive.map((item) => (
                  <div key={item.id} className="column is-half">
                    <CardTile
                      name={item.card.name}
                      imageUrl={item.card.imageUrl}
                      setName={item.card.set.name}
                      number={item.card.number}
                      rarity={item.card.rarity}
                      gameSlug={item.card.game.slug}
                      orientation={item.card.orientation}
                      quantityBadge={item.quantity}
                      href={`/cards/${item.cardId}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="column">
            <h3 className="title is-6">
              <span className="tag is-success mr-2">{t("tradeDetail.youReceiveTag")}</span>
              <span className="has-text-grey is-size-6">({iReceive.length})</span>
            </h3>
            {iReceive.length === 0 ? (
              <div className="notification is-light">{t("tradeDetail.nothingOnSide")}</div>
            ) : (
              <div className="columns is-mobile is-multiline is-variable is-2">
                {iReceive.map((item) => (
                  <div key={item.id} className="column is-half">
                    <CardTile
                      name={item.card.name}
                      imageUrl={item.card.imageUrl}
                      setName={item.card.set.name}
                      number={item.card.number}
                      rarity={item.card.rarity}
                      gameSlug={item.card.game.slug}
                      orientation={item.card.orientation}
                      quantityBadge={item.quantity}
                      href={`/cards/${item.cardId}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <TradeComments
          tradeId={trade.id}
          comments={trade.comments}
          myUserId={session.user.id}
        />

        <div className="mt-5">
          <TradeActions
            tradeId={trade.id}
            status={trade.status}
            iAmRequester={iAmRequester}
            iGiveCount={iGive.length}
            iReceiveCount={iReceive.length}
            cashCents={trade.cashCents}
            lastProposedById={trade.lastProposedById}
            myUserId={session.user.id}
            myConfirmed={
              iAmRequester
                ? trade.requesterFinishedAt !== null
                : trade.responderFinishedAt !== null
            }
            otherConfirmed={
              iAmRequester
                ? trade.responderFinishedAt !== null
                : trade.requesterFinishedAt !== null
            }
            otherHandle={other.handle}
          />
        </div>
      </div>
    </section>
  );
}
