"use client";

import { useState, useTransition } from "react";
import { createLgs } from "@/app/actions/lgs";
import { useT } from "@/lib/i18n/client";

export function CreateLgsForm() {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const t = useT();

  const submit = () => {
    setError(null);
    const trimmed = name.trim();
    if (trimmed.length < 3) {
      setError(t("lgs.nameTooShort"));
      return;
    }
    startTransition(async () => {
      try {
        const result = await createLgs({ name: trimmed, city: city.trim() || undefined });
        if (result && result.ok === false) {
          setError(result.error);
        }
      } catch (err) {
        if ((err as Error).message !== "NEXT_REDIRECT") {
          setError((err as Error).message);
        }
      }
    });
  };

  return (
    <div>
      <div className="field is-grouped is-align-items-flex-end" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
        <div className="control is-expanded">
          <label className="label is-size-7 has-text-grey mb-1">{t("lgs.namePlaceholder")}</label>
          <input
            className="input is-small"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="ex. Comic Café SP"
          />
        </div>
        <div className="control is-expanded">
          <label className="label is-size-7 has-text-grey mb-1">{t("lgs.cityPlaceholder")}</label>
          <input
            className="input is-small"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={60}
            placeholder="São Paulo, SP"
          />
        </div>
        <div className="control">
          <button
            onClick={submit}
            disabled={pending}
            className={`button is-small is-primary ${pending ? "is-loading" : ""}`}
          >
            {t("lgs.createBtn")}
          </button>
        </div>
      </div>
      {error && <p className="help is-danger mt-1">{error}</p>}
    </div>
  );
}
