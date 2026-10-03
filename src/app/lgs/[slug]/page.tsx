import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getLgsBySlug } from "@/lib/queries";
import { getT } from "@/lib/i18n/server";
import { LgsRowActions } from "../lgs-row-actions";
import { DeleteLgsButton } from "./delete-lgs-button";

export const dynamic = "force-dynamic";

export default async function LgsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [session, { t }, { slug }] = await Promise.all([auth(), getT(), params]);
  const lgs = await getLgsBySlug(slug);
  if (!lgs) notFound();

  const myMembership = session?.user
    ? lgs.memberships.find((m) => m.userId === session.user.id)
    : null;
  const owners = lgs.memberships.filter((m) => m.role === "OWNER");
  const members = lgs.memberships.filter((m) => m.role === "MEMBER");

  return (
    <section className="section">
      <div className="container">
        <nav className="breadcrumb is-small mb-4">
          <ul>
            <li>
              <Link href="/lgs">{t("lgs.title")}</Link>
            </li>
            <li className="is-active">
              <a>{lgs.name}</a>
            </li>
          </ul>
        </nav>

        <div className="box mb-5">
          <div className="level trade-header">
            <div className="level-left">
              <div>
                <h1 className="title is-4 mb-1">{lgs.name}</h1>
                <p className="has-text-grey is-size-7">
                  {lgs.city ? `${lgs.city} · ` : ""}
                  {t("lgs.memberCount", { count: lgs.memberships.length })}
                </p>
              </div>
            </div>
            {session?.user && (
              <div className="level-right">
                <LgsRowActions
                  lgsId={lgs.id}
                  isMember={!!myMembership}
                  isPrimary={myMembership?.isPrimary ?? false}
                  isOwner={myMembership?.role === "OWNER"}
                />
              </div>
            )}
          </div>
        </div>

        <div className="mb-5">
          <h2 className="title is-6 mb-3">{t("lgs.owners")}</h2>
          {owners.length === 0 ? (
            <p className="has-text-grey is-size-7 is-italic">{t("lgs.noOwners")}</p>
          ) : (
            <MembersGrid members={owners} />
          )}
        </div>

        <div>
          <h2 className="title is-6 mb-3">
            {t("lgs.membersTitle", { count: members.length })}
          </h2>
          {members.length === 0 ? (
            <p className="has-text-grey is-size-7 is-italic">{t("lgs.noMembers")}</p>
          ) : (
            <MembersGrid members={members} />
          )}
        </div>

        {/* Danger zone — owners only */}
        {myMembership?.role === "OWNER" && (
          <div
            className="box mt-6"
            style={{
              borderColor: "hsla(0, 68%, 58%, 0.4)",
              background: "hsla(0, 68%, 20%, 0.08)",
            }}
          >
            <h2 className="title is-6 mb-2" style={{ color: "hsl(0, 68%, 72%)" }}>
              {t("lgs.dangerZone")}
            </h2>
            <p className="is-size-7 has-text-grey mb-3">{t("lgs.deleteHint")}</p>
            <DeleteLgsButton
              lgsId={lgs.id}
              lgsName={lgs.name}
              memberCount={lgs.memberships.length}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function MembersGrid({
  members,
}: {
  members: {
    id: string;
    user: { id: string; handle: string | null; name: string | null; image: string | null };
  }[];
}) {
  return (
    <div className="columns is-multiline is-mobile is-variable is-2">
      {members.map((m) => {
        const u = m.user;
        return (
          <div
            key={m.id}
            className="column is-one-quarter-desktop is-one-third-tablet is-half-mobile"
          >
            <Link
              href={u.handle ? `/u/${u.handle}` : "#"}
              className="box user-card is-block"
              style={{ color: "inherit", padding: "0.5rem 0.75rem" }}
            >
              <div className="is-flex is-align-items-center" style={{ gap: "0.5rem" }}>
                {u.image ? (
                  <Image
                    src={u.image}
                    alt=""
                    width={32}
                    height={32}
                    style={{ borderRadius: "9999px", flexShrink: 0 }}
                  />
                ) : (
                  <div
                    className="has-background-light is-flex is-align-items-center is-justify-content-center has-text-grey"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "9999px",
                      flexShrink: 0,
                      fontWeight: 600,
                    }}
                  >
                    {u.handle?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div
                  className="is-size-7"
                  style={{
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {u.handle ? `@${u.handle}` : u.name ?? "unnamed"}
                </div>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
