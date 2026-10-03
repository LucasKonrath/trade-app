"use client";

import { useState, useTransition } from "react";
import { setGameInterests } from "@/app/actions/games";
import { AVAILABLE_GAMES, GAME_LABELS } from "@/lib/config";
import { useT } from "@/lib/i18n/client";
import type { GameSlug } from "@prisma/client";

type Props = {
  current: GameSlug[];
  layout?: "inline" | "block";
};

/**
 * Reusable game-preferences picker. Used on the onboarding page and the
 * /me/listings preferences section.
 */
export function GameInterestsForm({ current, layout = "block" }: Props) {
  const [selected, setSelected] = useState<Set<GameSlug>>(new Set(current));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const t = useT();

  const toggle = (slug: GameSlug) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const save = () => {
    setError(null);
    const slugs = [...selected];
    if (slugs.length === 0) {
      setError(t("games.pickOne"));
      return;
    }
    startTransition(async () => {
      try {
        const result = await setGameInterests({ slugs });
        if (result && result.ok === false) {
          setError(result.error);
          return;
        }
        setSavedAt(Date.now());
      } catch (err) {
        setError((err as Error).message);
      }
    });
  };

  const dirty =
    selected.size !== current.length ||
    [...selected].some((s) => !current.includes(s));

  return (
    <div className={layout === "inline" ? "" : ""}>
      <div className="tags" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
        {AVAILABLE_GAMES.map((slug) => {
          const on = selected.has(slug);
          return (
            <label
              key={slug}
              className={`tag is-medium ${on ? "is-primary" : "is-light"}`}
              style={{ cursor: "pointer", userSelect: "none" }}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(slug)}
                style={{ marginRight: 6 }}
              />
              {GAME_LABELS[slug]}
            </label>
          );
        })}
      </div>
      {error && <p className="help is-danger mt-2">{error}</p>}
      <div
        className="mt-3 is-flex is-align-items-center"
        style={{ gap: "0.75rem" }}
      >
        <button
          onClick={save}
          disabled={pending || !dirty}
          className={`button is-small is-primary ${pending ? "is-loading" : ""}`}
        >
          {t("games.save")}
        </button>
        {savedAt && !dirty && (
          <span className="is-size-7 has-text-grey">{t("games.saved")}</span>
        )}
      </div>
    </div>
  );
}
