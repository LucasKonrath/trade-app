"use client";

import { useActionState } from "react";
import { setHandle, type HandleState } from "@/app/actions/handle";

const INITIAL: HandleState = {};

type Props = {
  placeholder: string;
  submitLabel: string;
};

export function OnboardingForm({ placeholder, submitLabel }: Props) {
  const [state, action, pending] = useActionState(setHandle, INITIAL);

  return (
    <form action={action}>
      <div className="field">
        <div className="control has-icons-left">
          <input
            name="handle"
            required
            minLength={3}
            maxLength={24}
            pattern="[a-z0-9_]+"
            placeholder={placeholder}
            className={`input ${state.error ? "is-danger" : ""}`}
          />
          <span className="icon is-small is-left">@</span>
        </div>
        {state.error && <p className="help is-danger">{state.error}</p>}
      </div>

      <div className="field">
        <div className="control">
          <button
            disabled={pending}
            className={`button is-primary is-fullwidth ${pending ? "is-loading" : ""}`}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
