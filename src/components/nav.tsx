import Link from "next/link";
import { auth, signOut, signIn } from "@/auth";
import { NavBurger } from "./nav-burger";
import { LocaleSwitcher } from "./locale-switcher";
import { getT } from "@/lib/i18n/server";
import { getPendingTradeCount } from "@/lib/queries";

export async function Nav() {
  const [session, { t }] = await Promise.all([auth(), getT()]);
  const pendingTrades = session?.user ? await getPendingTradeCount(session.user.id) : 0;

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
                <Link href="/me/listings" className="navbar-item">
                  {t("nav.myListings")}
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
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                  className="is-flex is-align-items-center"
                  style={{ gap: "0.75rem" }}
                >
                  <span className="has-text-grey-light is-size-7">
                    {session.user.handle ? `@${session.user.handle}` : session.user.email}
                  </span>
                  <button className="button is-light is-small">{t("nav.signOut")}</button>
                </form>
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
