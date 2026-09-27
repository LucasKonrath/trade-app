import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 420 }}>
        <div className="box">
          <h1 className="title is-4">Sign in</h1>
          <p className="subtitle is-6 has-text-grey">Choose a provider to continue.</p>

          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/onboarding" });
            }}
            className="mb-3"
          >
            <button className="button is-fullwidth">Continue with Google</button>
          </form>

          <form
            action={async () => {
              "use server";
              await signIn("discord", { redirectTo: "/onboarding" });
            }}
          >
            <button className="button is-fullwidth">Continue with Discord</button>
          </form>
        </div>
      </div>
    </section>
  );
}
