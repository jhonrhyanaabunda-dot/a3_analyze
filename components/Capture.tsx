"use client";

import { useState } from "react";
import type { Lead } from "@/lib/types";

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

type FieldKey = "name" | "dealership" | "email" | "website" | "city" | "phone";

export default function Capture({
  previewScore,
  onBack,
  onSubmit,
}: {
  previewScore: number;
  onBack: () => void;
  onSubmit: (lead: Lead) => void;
}) {
  const [f, setF] = useState<Record<FieldKey, string>>({
    name: "",
    dealership: "",
    email: "",
    website: "",
    city: "",
    phone: "",
  });
  const [err, setErr] = useState<Partial<Record<FieldKey, boolean>>>({});

  const set = (k: FieldKey, v: string) => setF((s) => ({ ...s, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Partial<Record<FieldKey, boolean>> = {
      name: !f.name.trim(),
      dealership: !f.dealership.trim(),
      email: !emailOk(f.email),
      website: !f.website.trim(),
      city: !f.city.trim(),
    };
    setErr(next);
    if (Object.values(next).some(Boolean)) return;
    onSubmit({
      name: f.name.trim(),
      dealership: f.dealership.trim(),
      email: f.email.trim(),
      website: f.website.trim(),
      city: f.city.trim(),
      phone: f.phone.trim(),
    });
  };

  const field = (
    id: FieldKey,
    label: React.ReactNode,
    placeholder: string,
    msg: string,
    type = "text"
  ) => (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={f[id]}
        onChange={(e) => set(id, e.target.value)}
        className={err[id] ? "err" : ""}
      />
      <div className="msg">{msg}</div>
    </div>
  );

  return (
    <section className="stage anim-left">
      <div className="card">
        <div className="cap-intro">
          <span className="tease">⬤ Your report is ready</span>
          <h2>
            Where should we send your
            <br />
            full visibility report?
          </h2>
          <p>
            Drop your details and your website, and we&apos;ll run a live analysis of how you show up
            across Google and AI search, then send a copy you can forward to your team.
          </p>
          <div className="preview-score">
            Your preliminary score: <b>{previewScore} / 100</b>
          </div>
        </div>
        <form onSubmit={submit} noValidate>
          {field("name", "Your name", "Alex Morgan", "Please enter your name.")}
          {field("dealership", "Dealership", "Morgan Acura of Dallas", "Please enter your dealership.")}
          {field("email", "Work email", "alex@morganacura.com", "Please enter a valid email address.", "email")}
          {field("website", "Dealership website", "morganacura.com", "Please enter your website so we can analyze it.")}
          {field("city", "City / market", "Dallas, TX", "Please enter your city or market.")}
          {field(
            "phone",
            <>
              Phone <span style={{ textTransform: "none", color: "var(--medium)" }}>(optional)</span>
            </>,
            "(555) 123-4567",
            "",
            "tel"
          )}
          <div className="consent">
            By submitting, you agree to let A3 Brands email you your report and occasional insights.
            Unsubscribe anytime. We never sell your data.
          </div>
          <div className="card-nav">
            <button type="button" className="btn btn-ghost" onClick={onBack}>
              &larr; Back
            </button>
            <button type="submit" className="btn btn-primary">
              RUN MY ANALYSIS &rarr;
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
