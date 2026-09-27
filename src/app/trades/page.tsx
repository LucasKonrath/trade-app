import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMyTrades } from "@/lib/queries";
import { getT } from "@/lib/i18n/server";
import { TradeStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<TradeStatus, string> = {
  OPEN: "is-light",
  REQUESTED: "is-info",
  ACCEPTED: "is-primary",
  FINISHED: "is-success",
};

export default async function TradesPage() {
  const [session, { t }] = await Promise.all([auth(), getT()]);
  if (!session?.user) redirect("/signin");
  if (!session.user.handle) redirect("/onboarding");
  const me = session.user;

  const trades = await getMyTrades(me.id);
  const outgoing = trades.filter((tr) => tr.requesterId === me.id);
  const incoming = trades.filter((tr) => tr.responderId === me.id);

  return (
    <section className="section">
      <div className="container">
        <h1 className="title is-3">{t("trades.title")}</h1>
        <p className="subtitle is-6 has-text-grey">{t("trades.subtitle")}</p>

        <Section
          title={t("trades.incoming")}
          empty={t("trades.noIncoming")}
          trades={incoming}
          me={me.id}
          t={t}
        />
        <Section
          title={t("trades.outgoing")}
          empty={t("trades.noOutgoing")}
          trades={outgoing}
          me={me.id}
          t={t}
        />
      </div>
    </section>
  );
}

function Section({
  title,
  empty,
  trades,
  me,
  t,
}: {
  title: string;
  empty: string;
  trades: Awaited<ReturnType<typeof getMyTrades>>;
  me: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <div className="mb-6">
      <h2 className="title is-5">{title}</h2>
      {trades.length === 0 ? (
        <div className="notification is-light">{empty}</div>
      ) : (
        <div className="box p-0 trades-table-wrap">
          <table className="table is-fullwidth is-hoverable mb-0">
            <thead>
              <tr>
                <th>{t("trades.counterparty")}</th>
                <th>{t("trades.status")}</th>
                <th>{t("trades.youGiveCol")}</th>
                <th>{t("trades.youReceiveCol")}</th>
                <th>{t("trades.updated")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {trades.map((tr) => {
                const iAmRequester = tr.requesterId === me;
                const other = iAmRequester ? tr.responder : tr.requester;
                const giveCount = tr.items.filter(
                  (i) => (iAmRequester ? "FROM_REQUESTER" : "FROM_RESPONDER") === i.direction,
                ).length;
                const receiveCount = tr.items.length - giveCount;
                return (
                  <tr key={tr.id}>
                    <td>
                      <div
                        className="is-flex is-align-items-center"
                        style={{ gap: "0.5rem" }}
                      >
                        {other.image && (
                          <Image
                            src={other.image}
                            alt=""
                            width={24}
                            height={24}
                            style={{ borderRadius: "9999px" }}
                          />
                        )}
                        <Link href={other.handle ? `/u/${other.handle}` : "#"}>
                          {other.handle ? `@${other.handle}` : other.name ?? "unnamed"}
                        </Link>
                      </div>
                    </td>
                    <td>
                      <span className={`tag ${STATUS_TONE[tr.status]}`}>
                        {t(`tradeStatus.${tr.status}`)}
                      </span>
                    </td>
                    <td>{giveCount}</td>
                    <td>{receiveCount}</td>
                    <td className="has-text-grey is-size-7">
                      {new Date(tr.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="has-text-right">
                      <Link href={`/trades/${tr.id}`} className="button is-small is-light">
                        {t("common.openBtn")}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
