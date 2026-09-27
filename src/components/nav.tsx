import Link from "next/link";
import { auth, signOut, signIn } from "@/auth";
import { NavBurger } from "./nav-burger";

export async function Nav() {
  const session = await auth();

  return (
    <nav className="navbar has-shadow brand-navbar" role="navigation" aria-label="main navigation">
      <div className="container">
        <div className="navbar-brand">
          <Link href="/" className="navbar-item has-text-weight-bold">
            Trade App
          </Link>
        </div>

        <NavBurger>
          <div className="navbar-start">
            <Link href="/cards" className="navbar-item">
              Cards
            </Link>
            <Link href="/browse" className="navbar-item">
              Browse
            </Link>
            {session?.user && (
              <>
                <Link href="/matches" className="navbar-item">
                  Matches
                </Link>
                <Link href="/trades" className="navbar-item">
                  Trades
                </Link>
                <Link href="/me/listings" className="navbar-item">
                  My listings
                </Link>
              </>
            )}
          </div>

          <div className="navbar-end">
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
                  <button className="button is-light is-small">Sign out</button>
                </form>
              ) : (
                <form
                  action={async () => {
                    "use server";
                    await signIn();
                  }}
                >
                  <button className="button is-primary is-small">Sign in</button>
                </form>
              )}
            </div>
          </div>
        </NavBurger>
      </div>
    </nav>
  );
}
