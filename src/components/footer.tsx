import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export async function Footer() {
  const { t } = await getT();
  return (
    <footer className="site-footer">
      <div
        className="container is-flex is-justify-content-space-between is-align-items-center"
        style={{ flexWrap: "wrap", gap: "0.5rem" }}
      >
        <span className="is-size-7 has-text-grey-light">
          Mulligan · {new Date().getFullYear()}
        </span>
        <div className="is-flex" style={{ gap: "1rem" }}>
          <Link href="/privacy" className="is-size-7 has-text-grey-light">
            {t("footer.privacy")}
          </Link>
          <Link href="/terms" className="is-size-7 has-text-grey-light">
            {t("footer.terms")}
          </Link>
          <a
            href="mailto:lucaskdamaceno@gmail.com"
            className="is-size-7 has-text-grey-light"
          >
            {t("footer.contact")}
          </a>
        </div>
      </div>
    </footer>
  );
}
