import Image from "next/image";
import Link from "next/link";

type Props = {
  name: string;
  imageUrl?: string | null;
  setName?: string;
  number?: string | null;
  rarity?: string | null;
  gameSlug?: string;
  orientation?: string | null;
  quantityBadge?: number | null; // overlay top-right "×N" when > 1
  href?: string; // when set, the image + text section becomes a link to this URL
  footer?: React.ReactNode;
};

export function CardTile({
  name,
  imageUrl,
  setName,
  number,
  rarity,
  gameSlug,
  orientation,
  quantityBadge,
  href,
  footer,
}: Props) {
  const aspectClass = orientation === "landscape" ? "is-3by2" : "is-2by3";
  const meta = [setName, number ? `#${number}` : null, rarity, gameSlug]
    .filter(Boolean)
    .join(" · ");

  const info = (
    <>
      <div className="card-image" style={{ position: "relative" }}>
        <figure className={`image ${aspectClass}`}>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
            />
          ) : (
            <div
              className="is-flex is-justify-content-center is-align-items-center has-text-grey-light"
              style={{ width: "100%", height: "100%", fontSize: "0.75rem" }}
            >
              No image
            </div>
          )}
        </figure>
        {quantityBadge && quantityBadge > 1 && (
          <span
            className="tag is-primary"
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              fontWeight: 700,
              fontSize: "0.75rem",
              padding: "0 0.5em",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.5)",
              pointerEvents: "none",
            }}
          >
            ×{quantityBadge}
          </span>
        )}
      </div>
      <div className="card-content">
        <div className="card-name" title={name}>
          {name}
        </div>
        <div className="card-meta" title={meta}>
          {meta}
        </div>
      </div>
    </>
  );

  return (
    <div className="card card-tile">
      {href ? (
        <Link href={href} className="has-text-inherit" style={{ color: "inherit" }}>
          {info}
        </Link>
      ) : (
        info
      )}
      {footer && (
        <div className="card-content" style={{ paddingTop: 0 }}>
          {footer}
        </div>
      )}
    </div>
  );
}
