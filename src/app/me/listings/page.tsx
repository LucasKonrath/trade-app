import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMyListings } from "@/lib/queries";
import { CardTile } from "@/components/card-tile";
import { ListingEditor } from "./listing-editor";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function MyListingsPage() {
  const [session, { t }] = await Promise.all([auth(), getT()]);
  if (!session?.user) redirect("/signin");
  if (!session.user.handle) redirect("/onboarding");

  const listings = await getMyListings(session.user.id);
  const haves = listings.filter((l) => l.kind === "HAVE");
  const wants = listings.filter((l) => l.kind === "WANT");

  return (
    <section className="section">
      <div className="container">
        <div className="level">
          <div className="level-left">
            <div>
              <h1 className="title is-3">{t("myListings.title")}</h1>
              <p className="subtitle is-6 has-text-grey">
                {t("myListings.summary", { haves: haves.length, wants: wants.length })}
              </p>
            </div>
          </div>
          <div className="level-right">
            <Link href="/cards" className="button is-light">
              {t("myListings.addFromCatalog")}
            </Link>
          </div>
        </div>

        <Section
          title={t("myListings.haveTitle")}
          tone="is-success"
          empty={t("myListings.noHaves")}
          browseLabel={t("myListings.browseCards")}
          listings={haves}
        />
        <Section
          title={t("myListings.wantTitle")}
          tone="is-warning"
          empty={t("myListings.noWants")}
          browseLabel={t("myListings.browseCards")}
          listings={wants}
        />
      </div>
    </section>
  );
}

function Section({
  title,
  tone,
  empty,
  browseLabel,
  listings,
}: {
  title: string;
  tone: string;
  empty: string;
  browseLabel: string;
  listings: Awaited<ReturnType<typeof getMyListings>>;
}) {
  return (
    <div className="mb-6">
      <h2 className="title is-5 mb-3">
        <span className={`tag ${tone} mr-2`}>{title}</span>
        <span className="has-text-grey is-size-6">({listings.length})</span>
      </h2>
      {listings.length === 0 ? (
        <div className="notification is-light has-text-centered">
          {empty}{" "}
          <Link href="/cards" className="has-text-link">
            {browseLabel}
          </Link>
        </div>
      ) : (
        <div className="columns is-mobile is-multiline is-variable is-3">
          {listings.map((l) => (
            <div key={l.id} className="column is-2-desktop is-one-third-tablet is-half-mobile">
              <CardTile
                name={l.card.name}
                imageUrl={l.card.imageUrl}
                setName={l.card.set.name}
                number={l.card.number}
                rarity={l.card.rarity}
                gameSlug={l.card.game.slug}
                orientation={l.card.orientation}
                href={`/cards/${l.card.id}`}
                footer={
                  <ListingEditor
                    listingId={l.id}
                    cardId={l.card.id}
                    kind={l.kind}
                    quantity={l.quantity}
                    condition={l.condition}
                    note={l.note}
                    offerType={l.offerType}
                    priceCents={l.priceCents}
                  />
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
