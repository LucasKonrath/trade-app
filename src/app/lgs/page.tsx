import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLgsList } from "@/lib/queries";
import { getT } from "@/lib/i18n/server";
import { CreateLgsForm } from "./create-lgs-form";
import { LgsRowActions } from "./lgs-row-actions";

export const dynamic = "force-dynamic";

export default async function LgsListPage() {
  const [session, { t }] = await Promise.all([auth(), getT()]);
  if (!session?.user) redirect("/signin");

  const lgss = await getLgsList(session.user.id);
  const myCount = lgss.filter((l) => l.myMembership).length;

  return (
    <section className="section">
      <div className="container">
        <h1 className="title is-3">{t("lgs.title")}</h1>
        <p className="subtitle is-6 has-text-grey">
          {t("lgs.summary", { total: lgss.length, mine: myCount })}
        </p>

        <div className="box mb-5">
          <h2 className="title is-6 mb-3">{t("lgs.createTitle")}</h2>
          <CreateLgsForm />
        </div>

        {lgss.length === 0 ? (
          <div className="notification is-light">{t("lgs.empty")}</div>
        ) : (
          <div className="listing-rows">
            {lgss.map((l) => (
              <div key={l.id} className="box listing-row mb-2">
                <div className="listing-row-main">
                  <div className="listing-row-user">
                    <div>
                      <Link
                        href={`/lgs/${l.slug}`}
                        className="has-text-weight-semibold"
                      >
                        {l.name}
                      </Link>
                      <div className="listing-row-meta">
                        {l.city && (
                          <span className="tag is-small is-light">{l.city}</span>
                        )}
                        <span className="has-text-grey is-size-7">
                          {t("lgs.memberCount", { count: l.memberCount })}
                        </span>
                        {l.myMembership?.role === "OWNER" && (
                          <span className="tag is-small is-primary is-light">
                            {t("lgs.roleOwner")}
                          </span>
                        )}
                        {l.myMembership?.isPrimary && (
                          <span className="tag is-small is-success is-light">
                            {t("lgs.primary")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="listing-row-action">
                    <LgsRowActions
                      lgsId={l.id}
                      isMember={!!l.myMembership}
                      isPrimary={l.myMembership?.isPrimary ?? false}
                      isOwner={l.myMembership?.role === "OWNER"}
                    />
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
