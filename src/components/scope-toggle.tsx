import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import type { LgsScope } from "@/lib/lgs";

type Props = {
  pathname: string;
  scope: LgsScope;
  currentQuery: Record<string, string | number | undefined>;
};

export async function ScopeToggle({ pathname, scope, currentQuery }: Props) {
  const { t } = await getT();
  const nextScope: LgsScope = scope === "all" ? "primary" : "all";
  const nextQuery: Record<string, string | number | undefined> = {
    ...currentQuery,
    scope: nextScope === "primary" ? undefined : nextScope,
    page: undefined,
  };

  return (
    <div className="is-flex is-align-items-center is-justify-content-space-between mb-3">
      <span className="has-text-grey is-size-7">
        {scope === "all" ? t("lgs.showingAll") : t("lgs.showingMine")}
      </span>
      <Link
        href={{ pathname, query: nextQuery }}
        className="button is-small is-light"
      >
        {scope === "all" ? t("lgs.scopePrimary") : t("lgs.scopeAll")}
      </Link>
    </div>
  );
}
