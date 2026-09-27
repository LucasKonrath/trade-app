import Link from "next/link";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <section className="hero is-medium brand-hero">
      <div className="hero-body">
        <div className="container">
          <h1 className="title is-2">Trade TCG cards with players at your LGS.</h1>
          <p className="subtitle is-5 mt-4">
            Post the cards you have and the cards you want. We&apos;ll find matches — players
            who want what you have and have what you want.
          </p>
          <div className="buttons mt-5">
            {session?.user ? (
              <>
                <Link href="/matches" className="button is-primary is-medium">
                  See matches
                </Link>
                <Link href="/me/listings" className="button is-light is-medium">
                  My listings
                </Link>
              </>
            ) : (
              <Link href="/signin" className="button is-primary is-medium">
                Sign in to start trading
              </Link>
            )}
            <Link href="/cards" className="button is-light is-medium">
              Browse cards
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
