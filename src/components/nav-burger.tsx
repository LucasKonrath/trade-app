"use client";

import { useState } from "react";

type Props = {
  children: React.ReactNode;
};

export function NavBurger({ children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <a
        role="button"
        className={`navbar-burger ${open ? "is-active" : ""}`}
        aria-label="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </a>
      <div className={`navbar-menu ${open ? "is-active" : ""}`}>{children}</div>
    </>
  );
}
