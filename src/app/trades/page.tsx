import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMyTrades } from "@/lib/queries";
import { TradeStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<TradeStatus, string> = {
  OPEN: "is-light",
  REQUESTED: "is-info",
  ACCEPTED: "is-primary",
  FINISHED: "is-success",
};

export default async function TradesPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  if (!session.user.handle) redirect("/onboarding");
  const me = session.user;

  const trades = await getMyTrades(me.id);
  const outgoing = trades.filter((t) => t.requesterId === me.id);
  const incoming = trades.filter((t) => t.responderId === me.id);

  return (
    <section className="section">
      <div className="container">
        <h1 className="title is-3">Trades</h1>
        <p className="subtitle is-6 has-text-grey">
          Track proposals you&apos;ve sent and requests you&apos;ve received.
        </p>

        <Section title="Incoming" empty="No incoming trade requests." trades={incoming} me={me.id} />
        <Section title="Outgoing" empty="You haven't proposed any trades yet." trades={outgoing} me={me.id} />
      </div>
    </section>
  );
}

function Section({
  title,
  empty,
  trades,
  me,
}: {
  title: string;
  empty: string;
  trades: Awaited<ReturnType<typeof getMyTrades>>;
  me: string;
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
                <th>Counterparty</th>
                <th>Status</th>
                <th>You give</th>
                <th>You receive</th>
                <th>Updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => {
                const iAmRequester = t.requesterId === me;
                const other = iAmRequester ? t.responder : t.requester;
                const giveCount = t.items.filter(
                  (i) => (iAmRequester ? "FROM_REQUESTER" : "FROM_RESPONDER") === i.direction,
                ).length;
                const receiveCount = t.items.length - giveCount;
                return (
                  <tr key={t.id}>
                    <td>
                      <div className="is-flex is-align-items-center" style={{ gap: "0.5rem" }}>
                        {other.image && (
                          <Image src={other.image} alt="" width={24} height={24} style={{ borderRadius: "9999px" }} />
                        )}
                        <Link href={other.handle ? `/u/${other.handle}` : "#"}>
                          {other.handle ? `@${other.handle}` : other.name ?? "unnamed"}
                        </Link>
                      </div>
                    </td>
                    <td>
                      <span className={`tag ${STATUS_TONE[t.status]}`}>{t.status}</span>
                    </td>
                    <td>{giveCount}</td>
                    <td>{receiveCount}</td>
                    <td className="has-text-grey is-size-7">
                      {new Date(t.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="has-text-right">
                      <Link href={`/trades/${t.id}`} className="button is-small is-light">
                        Open
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
