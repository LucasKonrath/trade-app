"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { addTradeComment } from "@/app/actions/trades";
import { useT, useLocale } from "@/lib/i18n/client";

type Comment = {
  id: string;
  body: string;
  createdAt: Date | string;
  user: {
    id: string;
    handle: string | null;
    name: string | null;
    image: string | null;
  };
};

type Props = {
  tradeId: string;
  comments: Comment[];
  myUserId: string;
};

export function TradeComments({ tradeId, comments, myUserId }: Props) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const t = useT();
  const locale = useLocale();

  const submit = () => {
    setError(null);
    const trimmed = body.trim();
    if (!trimmed) return;
    startTransition(async () => {
      try {
        await addTradeComment({ tradeId, body: trimmed });
        setBody("");
      } catch (err) {
        setError((err as Error).message);
      }
    });
  };

  const formatTime = (raw: Date | string) => {
    const d = new Date(raw);
    return d.toLocaleString(locale, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <section className="mt-6">
      <h2 className="title is-5 mb-3">{t("comments.title")}</h2>

      {comments.length === 0 ? (
        <div className="notification is-light is-size-7 has-text-grey">
          {t("comments.empty")}
        </div>
      ) : (
        <div className="comment-thread">
          {comments.map((c) => {
            const mine = c.user.id === myUserId;
            const label = c.user.handle ? `@${c.user.handle}` : c.user.name ?? "unnamed";
            return (
              <div
                key={c.id}
                className={`comment-row ${mine ? "is-mine" : "is-theirs"}`}
              >
                {!mine && c.user.image && (
                  <Image
                    src={c.user.image}
                    alt=""
                    width={28}
                    height={28}
                    style={{ borderRadius: "9999px", flexShrink: 0 }}
                  />
                )}
                <div className="comment-bubble">
                  {!mine && (
                    <Link
                      href={c.user.handle ? `/u/${c.user.handle}` : "#"}
                      className="is-size-7 has-text-weight-semibold"
                    >
                      {label}
                    </Link>
                  )}
                  <div className="comment-body">{c.body}</div>
                  <div className="comment-time">{formatTime(c.createdAt)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="field mt-4">
        <div className="control">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={t("comments.placeholder")}
            maxLength={500}
            rows={2}
            className="textarea is-small"
          />
        </div>
      </div>
      {error && <p className="help is-danger">{error}</p>}
      <div className="is-flex is-justify-content-space-between is-align-items-center mt-1">
        <span className="is-size-7 has-text-grey">
          {t("comments.remaining", { count: 500 - body.length })}
        </span>
        <button
          onClick={submit}
          disabled={pending || body.trim() === ""}
          className={`button is-small is-primary ${pending ? "is-loading" : ""}`}
        >
          {t("comments.send")}
        </button>
      </div>
    </section>
  );
}
