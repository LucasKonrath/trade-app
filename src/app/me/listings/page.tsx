import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMyListings } from "@/lib/queries";
import { CardTile } from "@/components/card-tile";
import { ListingEditor } from "./listing-editor";

export const dynamic = "force-dynamic";

export default async function MyListingsPage() {
  const session = await auth();
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
              <h1 className="title is-3">My listings</h1>
              <p className="subtitle is-6 has-text-grey">
                {haves.length} HAVE · {wants.length} WANT
              </p>
            </div>
          </div>
          <div className="level-right">
            <Link href="/cards" className="button is-light">
              Add from catalog →
            </Link>
          </div>
        </div>

        <Section title="HAVE" tone="is-success" empty="You haven't listed any cards you have yet." listings={haves} />
        <Section title="WANT" tone="is-warning" empty="You haven't listed any cards you want yet." listings={wants} />
      </div>
    </section>
  );
}

function Section({
  title,
  tone,
  empty,
  listings,
}: {
  title: string;
  tone: string;
  empty: string;
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
            Browse cards →
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
                footer={
                  <ListingEditor
                    listingId={l.id}
                    cardId={l.card.id}
                    kind={l.kind}
                    quantity={l.quantity}
                    condition={l.condition}
                    note={l.note}
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
