"use client";

import { useState, useTransition } from "react";
import { setDiscordWebhook, testDiscordWebhook } from "@/app/actions/notifications";
import { useT } from "@/lib/i18n/client";

type Props = {
  current: string | null;
};

export function DiscordWebhookForm({ current }: Props) {
  const [url, setUrl] = useState(current ?? "");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(
    null,
  );
  const t = useT();

  const save = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await setDiscordWebhook({ url });
      if (res.ok) {
        setMessage({
          tone: "success",
          text: res.cleared ? t("discord.cleared") : t("discord.saved"),
        });
      } else {
        setMessage({ tone: "danger", text: res.error ?? t("discord.error") });
      }
    });
  };

  const test = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await testDiscordWebhook();
      if (res.ok) {
        setMessage({ tone: "success", text: t("discord.testSent") });
      } else {
        setMessage({ tone: "danger", text: res.error ?? t("discord.error") });
      }
    });
  };

  const cleaned = url.trim();
  const dirty = cleaned !== (current ?? "");
  const hasSaved = !!current;

  return (
    <div>
      <details className="mb-3">
        <summary className="is-size-7 has-text-grey" style={{ cursor: "pointer" }}>
          {t("discord.howto")}
        </summary>
        <ol className="is-size-7 has-text-grey mt-2 pl-4" style={{ lineHeight: 1.5 }}>
          <li>{t("discord.step1")}</li>
          <li>{t("discord.step2")}</li>
          <li>{t("discord.step3")}</li>
        </ol>
      </details>

      <div className="field">
        <div className="control">
          <input
            type="url"
            className="input is-small"
            placeholder="https://discord.com/api/webhooks/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            maxLength={500}
          />
        </div>
      </div>

      {message && (
        <p className={`help is-${message.tone} mb-2`}>{message.text}</p>
      )}

      <div className="buttons are-small" style={{ gap: "0.375rem" }}>
        <button
          onClick={save}
          disabled={pending || !dirty}
          className={`button is-small is-primary ${pending ? "is-loading" : ""}`}
        >
          {t("common.save")}
        </button>
        {hasSaved && !dirty && (
          <button
            onClick={test}
            disabled={pending}
            className="button is-small is-light"
          >
            {t("discord.testBtn")}
          </button>
        )}
      </div>
    </div>
  );
}
