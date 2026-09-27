import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  if (session.user.handle) redirect("/me/listings");

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 480 }}>
        <div className="box">
          <h1 className="title is-4">Pick a handle</h1>
          <p className="subtitle is-6 has-text-grey">
            Other traders will see this on your listings and matches.
          </p>
          <OnboardingForm />
        </div>
      </div>
    </section>
  );
}
