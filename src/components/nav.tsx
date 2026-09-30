import Link from "next/link";
import { auth, signOut, signIn } from "@/auth";
import { NavBurger } from "./nav-burger";
import { LocaleSwitcher } from "./locale-switcher";
import { getT } from "@/lib/i18n/server";
import { getPendingTradeCount } from "@/lib/queries";
import { getViewerLgsContext } from "@/lib/lgs";

export async function Nav() {
  const [session, { t }] = await Promise.all([auth(), getT()]);
  const [pendingTrades, lgsCtx] = session?.user
    ? await Promise.all([
        getPendingTradeCount(session.user.id),
        getViewerLgsContext(session.user.id),
      ])
    : [0, { primary: null, memberships: [] }];

  return (
    <nav className="navbar has-shadow brand-navbar" role="navigation" aria-label="main navigation">
      <div className="container">
        <div className="navbar-brand">
          <Link href="/" className="navbar-item has-text-weight-bold">
            {t("nav.brand")}
          </Link>
        </div>

        <NavBurger>
          <div className="navbar-start">
            <Link href="/cards" className="navbar-item">
              {t("nav.cards")}
            </Link>
            <Link href="/browse" className="navbar-item">
              {t("nav.browse")}
            </Link>
            <Link href="/users" className="navbar-item">
              {t("nav.users")}
            </Link>
            {session?.user && (
              <Link href="/lgs" className="navbar-item">
                {t("lgs.navLabel")}
                {lgsCtx.primary && (
                  <span
                    className="tag is-light is-small ml-2"
                    style={{ fontSize: "0.65rem" }}
                  >
                    {lgsCtx.primary.lgs.name}
                  </span>
                )}
              </Link>
            )}
            {session?.user && (
              <>
                <Link href="/matches" className="navbar-item">
                  {t("nav.matches")}
                </Link>
                <Link href="/trades" className="navbar-item">
                  {t("nav.trades")}
                  {pendingTrades > 0 && (
                    <span
                      className="tag is-primary is-rounded ml-2"
                      style={{ fontSize: "0.65rem", padding: "0 0.5em", height: "1.5em" }}
                    >
                      {pendingTrades}
                    </span>
                  )}
                </Link>
                <Link href="/me/deliveries" className="navbar-item">
                  {t("nav.deliveries")}
                </Link>
                <Link href="/me/listings" className="navbar-item">
                  {t("nav.myListings")}
                </Link>
                <Link href="/me/preferences" className="navbar-item">
                  {t("nav.preferences")}
                </Link>
              </>
            )}
          </div>

          <div className="navbar-end">
            <div className="navbar-item">
              <LocaleSwitcher />
            </div>
            <div className="navbar-item">
              {session?.user ? (
                <div className="is-flex is-align-items-center" style={{ gap: "0.75rem" }}>
                  <Link
                    href="/me/preferences"
                    className="has-text-grey-light is-size-7"
                    style={{ textDecoration: "none" }}
                  >
                    {session.user.handle ? `@${session.user.handle}` : session.user.email}
                  </Link>
                  <form
                    action={async () => {
                      "use server";
                      await signOut({ redirectTo: "/" });
                    }}
                  >
                    <button className="button is-light is-small">{t("nav.signOut")}</button>
                  </form>
                </div>
              ) : (
                <form
                  action={async () => {
                    "use server";
                    await signIn();
                  }}
                >
                  <button className="button is-primary is-small">{t("nav.signIn")}</button>
                </form>
              )}
            </div>
          </div>
        </NavBurger>
      </div>
    </nav>
  );
}
