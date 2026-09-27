import Image from "next/image";

type Props = {
  name: string;
  imageUrl?: string | null;
  setName?: string;
  number?: string | null;
  rarity?: string | null;
  gameSlug?: string;
  footer?: React.ReactNode;
};

export function CardTile({ name, imageUrl, setName, number, rarity, gameSlug, footer }: Props) {
  const meta = [
    setName,
    number ? `#${number}` : null,
    rarity,
    gameSlug,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="card card-tile">
      <div className="card-image">
        <figure className="image is-2by3">
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
      </div>
      <div className="card-content">
        <div className="card-name" title={name}>
          {name}
        </div>
        <div className="card-meta" title={meta}>
          {meta}
        </div>
        {footer && <div className="mt-3">{footer}</div>}
      </div>
    </div>
  );
}
