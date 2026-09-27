import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getTradeForUser } from "@/lib/queries";
import { CardTile } from "@/components/card-tile";
import { TradeActions } from "./trade-actions";
import { CashEditor } from "./cash-editor";
import { formatBRL } from "@/lib/money";
import { TradeStatus, TradeDirection } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<TradeStatus, string> = {
  OPEN: "is-light",
  REQUESTED: "is-info",
  ACCEPTED: "is-primary",
  FINISHED: "is-success",
};

const STATUS_BLURB: Record<TradeStatus, string> = {
  OPEN: "Draft — only you can see this. Send it when you're happy with the cards.",
  REQUESTED: "Sent. Waiting on the other party.",
  ACCEPTED: "Accepted. Arrange the swap in person, then mark it finished.",
  FINISHED: "Trade completed. Cards were removed from both HAVE/WANT lists.",
};

export default async function TradePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  if (!session.user.handle) redirect("/onboarding");

  const { id } = await params;
  const trade = await getTradeForUser(id, session.user.id);
  if (!trade) notFound();

  const iAmRequester = trade.requesterId === session.user.id;
  const other = iAmRequester ? trade.responder : trade.requester;

  const iGive = trade.items.filter((i) =>
    iAmRequester ? i.direction === TradeDirection.FROM_REQUESTER : i.direction === TradeDirection.FROM_RESPONDER,
  );
  const iReceive = trade.items.filter((i) =>
    iAmRequester ? i.direction === TradeDirection.FROM_RESPONDER : i.direction === TradeDirection.FROM_REQUESTER,
  );

  return (
    <section className="section">
      <div className="container">
        <nav className="breadcrumb is-small mb-4">
          <ul>
            <li>
              <Link href="/trades">Trades</Link>
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
                    Trading with {iAmRequester ? "" : "(they proposed)"}
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
              <span className={`tag is-large ${STATUS_TONE[trade.status]}`}>{trade.status}</span>
            </div>
          </div>
          <p className="has-text-grey is-size-7 mt-3 mb-0">{STATUS_BLURB[trade.status]}</p>

          {(() => {
            const cash = trade.cashCents;
            if (!cash) return null;
            const cashFromMe = iAmRequester ? cash < 0 : cash > 0;
            const amount = formatBRL(Math.abs(cash));
            return (
              <div className="notification is-info is-light mt-3 mb-0 py-2 px-3">
                <strong>{cashFromMe ? "You pay" : "You receive"} {amount}</strong>{" "}
                {cashFromMe
                  ? `to ${other.handle ? "@" + other.handle : "the other party"}`
                  : `from ${other.handle ? "@" + other.handle : "the other party"}`}
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
              <span className="tag is-warning mr-2">You give</span>
              <span className="has-text-grey is-size-6">({iGive.length})</span>
            </h3>
            {iGive.length === 0 ? (
              <div className="notification is-light">Nothing on this side yet.</div>
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
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="column">
            <h3 className="title is-6">
              <span className="tag is-success mr-2">You receive</span>
              <span className="has-text-grey is-size-6">({iReceive.length})</span>
            </h3>
            {iReceive.length === 0 ? (
              <div className="notification is-light">Nothing on this side yet.</div>
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
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5">
          <TradeActions
            tradeId={trade.id}
            status={trade.status}
            iAmRequester={iAmRequester}
            iGiveCount={iGive.length}
            iReceiveCount={iReceive.length}
            cashCents={trade.cashCents}
            myConfirmed={
              iAmRequester ? trade.requesterFinishedAt !== null : trade.responderFinishedAt !== null
            }
            otherConfirmed={
              iAmRequester ? trade.responderFinishedAt !== null : trade.requesterFinishedAt !== null
            }
            otherHandle={other.handle}
          />
        </div>
      </div>
    </section>
  );
}
