import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { getT } from "@/lib/i18n/server";

export default async function SignInPage() {
  const [session, { t }] = await Promise.all([auth(), getT()]);
  if (session?.user) redirect("/");

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 420 }}>
        <div className="box">
          <h1 className="title is-4">{t("signIn.title")}</h1>
          <p className="subtitle is-6 has-text-grey">{t("signIn.subtitle")}</p>

          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/onboarding" });
            }}
            className="mb-3"
          >
            <button className="button is-fullwidth">{t("signIn.google")}</button>
          </form>

          <form
            action={async () => {
              "use server";
              await signIn("discord", { redirectTo: "/onboarding" });
            }}
          >
            <button className="button is-fullwidth">{t("signIn.discord")}</button>
          </form>
        </div>
      </div>
    </section>
  );
}
