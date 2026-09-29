import Link from "next/link";
import Image from "next/image";
import { getTraders } from "@/lib/queries";
import { getT } from "@/lib/i18n/server";
import { auth } from "@/auth";
import { ScopeToggle } from "@/components/scope-toggle";
import { parseLgsScope } from "@/lib/lgs";

export const dynamic = "force-dynamic";

type SearchParams = { scope?: string };

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [session, { t }, params] = await Promise.all([auth(), getT(), searchParams]);
  const scope = parseLgsScope(params.scope);
  const traders = await getTraders(session?.user?.id ?? null, scope);
  const activeCount = traders.filter((tr) => tr.haves + tr.wants > 0).length;

  return (
    <section className="section">
      <div className="container">
        <h1 className="title is-3">{t("users.title")}</h1>
        <p className="subtitle is-6 has-text-grey">
          {t("users.summary", { count: traders.length, active: activeCount })}
        </p>

        {session?.user && <ScopeToggle pathname="/users" scope={scope} currentQuery={{}} />}

        {traders.length === 0 ? (
          <div className="notification is-light has-text-centered">{t("users.empty")}</div>
        ) : (
          <div className="columns is-multiline is-mobile is-variable is-3">
            {traders.map((tr) => (
              <div
                key={tr.id}
                className="column is-one-quarter-desktop is-one-third-tablet is-half-mobile"
              >
                <Link
                  href={`/u/${tr.handle}`}
                  className="box user-card is-block"
                  style={{ color: "inherit", height: "100%" }}
                >
                  <div className="is-flex is-align-items-center" style={{ gap: "0.75rem" }}>
                    {tr.image ? (
                      <Image
                        src={tr.image}
                        alt=""
                        width={48}
                        height={48}
                        style={{ borderRadius: "9999px", flexShrink: 0 }}
                      />
                    ) : (
                      <div
                        className="has-background-light is-flex is-align-items-center is-justify-content-center has-text-grey"
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: "9999px",
                          flexShrink: 0,
                          fontWeight: 600,
                        }}
                      >
                        {tr.handle[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        className="has-text-weight-semibold"
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        @{tr.handle}
                      </div>
                      {tr.name && (
                        <div
                          className="has-text-grey is-size-7"
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {tr.name}
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    className="tags mt-3 mb-0"
                    style={{ gap: "0.375rem", flexWrap: "wrap" }}
                  >
                    <span
                      className={`tag is-small ${tr.haves > 0 ? "is-success" : "is-light"}`}
                    >
                      {t("users.havesLabel", { count: tr.haves })}
                    </span>
                    <span
                      className={`tag is-small ${tr.wants > 0 ? "is-warning" : "is-light"}`}
                    >
                      {t("users.wantsLabel", { count: tr.wants })}
                    </span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
