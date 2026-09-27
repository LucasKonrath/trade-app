import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getT } from "@/lib/i18n/server";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const [session, { t }] = await Promise.all([auth(), getT()]);
  if (!session?.user) redirect("/signin");
  if (session.user.handle) redirect("/me/listings");

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 480 }}>
        <div className="box">
          <h1 className="title is-4">{t("onboarding.title")}</h1>
          <p className="subtitle is-6 has-text-grey">{t("onboarding.subtitle")}</p>
          <OnboardingForm
            placeholder={t("onboarding.placeholder")}
            submitLabel={t("onboarding.continue")}
          />
        </div>
      </div>
    </section>
  );
}
