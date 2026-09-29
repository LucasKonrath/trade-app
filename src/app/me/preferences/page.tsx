import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getUserGameInterests } from "@/lib/queries";
import { getViewerLgsContext } from "@/lib/lgs";
import { getT } from "@/lib/i18n/server";
import { GameInterestsForm } from "@/components/game-interests-form";
import { DiscordWebhookForm } from "@/components/discord-webhook-form";
import { LgsRowActions } from "@/app/lgs/lgs-row-actions";

export const dynamic = "force-dynamic";

export default async function PreferencesPage() {
  const [session, { t }] = await Promise.all([auth(), getT()]);
  if (!session?.user) redirect("/signin");
  if (!session.user.handle) redirect("/onboarding");

  const [myGames, lgsCtx, meRecord] = await Promise.all([
    getUserGameInterests(session.user.id),
    getViewerLgsContext(session.user.id),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { discordWebhookUrl: true },
    }),
  ]);

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 className="title is-3">{t("preferences.title")}</h1>
        <p className="subtitle is-6 has-text-grey">{t("preferences.subtitle")}</p>

        {/* Games */}
        <div className="box mt-5">
          <h2 className="title is-5 mb-2">{t("games.myGamesTitle")}</h2>
          <p className="is-size-7 has-text-grey mb-3">{t("games.myGamesHint")}</p>
          <GameInterestsForm current={myGames} />
        </div>

        {/* LGS memberships */}
        <div className="box mt-5">
          <div className="level trade-header mb-3">
            <div className="level-left">
              <div>
                <h2 className="title is-5 mb-1">{t("preferences.lgsSectionTitle")}</h2>
                <p className="is-size-7 has-text-grey">{t("preferences.lgsHint")}</p>
              </div>
            </div>
            <div className="level-right">
              <Link href="/lgs" className="button is-light is-small">
                {t("preferences.browseAllLgs")}
              </Link>
            </div>
          </div>

          {lgsCtx.memberships.length === 0 ? (
            <div className="notification is-light is-info">
              {t("preferences.noLgsYet")}{" "}
              <Link href="/lgs" className="has-text-link">
                {t("preferences.browseAllLgs")}
              </Link>
            </div>
          ) : (
            <div className="listing-rows">
              {lgsCtx.memberships.map((m) => (
                <div key={m.id} className="box listing-row mb-2">
                  <div className="listing-row-main">
                    <div className="listing-row-user">
                      <div>
                        <Link
                          href={`/lgs/${m.lgs.slug}`}
                          className="has-text-weight-semibold"
                        >
                          {m.lgs.name}
                        </Link>
                        <div className="listing-row-meta">
                          {m.lgs.city && (
                            <span className="tag is-small is-light">{m.lgs.city}</span>
                          )}
                          {m.role === "OWNER" && (
                            <span className="tag is-small is-primary is-light">
                              {t("lgs.roleOwner")}
                            </span>
                          )}
                          {m.isPrimary && (
                            <span className="tag is-small is-success is-light">
                              {t("lgs.primary")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="listing-row-action">
                      <LgsRowActions
                        lgsId={m.lgs.id}
                        isMember
                        isPrimary={m.isPrimary}
                        isOwner={m.role === "OWNER"}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Discord notifications */}
        <div className="box mt-5">
          <h2 className="title is-5 mb-2">{t("discord.sectionTitle")}</h2>
          <p className="is-size-7 has-text-grey mb-3">{t("discord.sectionHint")}</p>
          <DiscordWebhookForm current={meRecord?.discordWebhookUrl ?? null} />
        </div>

        {/* Account info (read-only for now) */}
        <div className="box mt-5">
          <h2 className="title is-5 mb-3">{t("preferences.accountSectionTitle")}</h2>
          <div className="is-size-7 has-text-grey">
            <div>
              <span className="has-text-weight-semibold">
                {t("preferences.handleLabel")}:
              </span>{" "}
              @{session.user.handle}
            </div>
            {session.user.email && (
              <div className="mt-2">
                <span className="has-text-weight-semibold">
                  {t("preferences.emailLabel")}:
                </span>{" "}
                {session.user.email}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
