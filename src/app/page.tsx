import Link from "next/link";
import { auth } from "@/auth";
import { getT } from "@/lib/i18n/server";

export default async function Home() {
  const [session, { t }] = await Promise.all([auth(), getT()]);

  return (
    <section className="hero is-medium brand-hero">
      <div className="hero-body">
        <div className="container">
          <h1 className="title is-2">{t("landing.heading")}</h1>
          <p className="subtitle is-5 mt-4">{t("landing.subheading")}</p>
          <div className="buttons mt-5">
            {session?.user ? (
              <>
                <Link href="/matches" className="button is-primary is-medium">
                  {t("landing.seeMatches")}
                </Link>
                <Link href="/me/listings" className="button is-light is-medium">
                  {t("landing.myListings")}
                </Link>
              </>
            ) : (
              <Link href="/signin" className="button is-primary is-medium">
                {t("landing.signInToStart")}
              </Link>
            )}
            <Link href="/cards" className="button is-light is-medium">
              {t("landing.browseCards")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
