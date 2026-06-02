"use client";

import { useEffect, useRef, useState } from "react";
import { QUESTIONS } from "@/lib/questions";
import Mascot from "./Mascot";

const COACH_LINES: Record<string, string[]> = {
  SEARCH: [
    "This one's about who's beating you on search. No wrong answers, just be straight.",
    "Search visibility is where most dealers quietly bleed. Where do you really stand?",
  ],
  DATA: [
    "Numbers question. If you're not sure, that's exactly the point worth knowing.",
    "Can't manage what you can't measure. How clear is your data here?",
  ],
  LOCAL: [
    "Local + reviews drive showroom visits. Be honest about this one.",
    "This is the foot-traffic stuff. How tight is it really?",
  ],
  SEGMENT: ["Quick gut check, what's actually keeping you up at night?"],
};

function coachLine(i: number): string {
  const Q = QUESTIONS[i];
  if (i === QUESTIONS.length - 1) return "Last one. If three real gaps showed up, would you act on them?";
  const pool = COACH_LINES[Q.p] || COACH_LINES.SEARCH;
  return pool[i % pool.length];
}

export default function Quiz({
  answers,
  onSelect,
  onComplete,
  onBackToIntro,
}: {
  answers: (number | null)[];
  onSelect: (idx: number, choice: number) => void;
  onComplete: () => void;
  onBackToIntro: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [anim, setAnim] = useState<"anim-left" | "anim-right">("anim-left");
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const Q = QUESTIONS[idx];
  const isSeg = Q.p === "SEGMENT";
  const selected = answers[idx];

  const goNext = () => {
    if (answers[idx] == null) return;
    if (idx === QUESTIONS.length - 1) {
      onComplete();
      return;
    }
    setAnim("anim-left");
    setIdx((i) => i + 1);
  };
  const goPrev = () => {
    if (idx === 0) {
      onBackToIntro();
      return;
    }
    setAnim("anim-right");
    setIdx((i) => i - 1);
  };

  const pick = (choice: number) => {
    const fresh = answers[idx] == null;
    onSelect(idx, choice);
    if (fresh) {
      if (autoTimer.current) clearTimeout(autoTimer.current);
      autoTimer.current = setTimeout(() => {
        if (idx === QUESTIONS.length - 1) onComplete();
        else {
          setAnim("anim-left");
          setIdx((i) => i + 1);
        }
      }, 280);
    }
  };

  // keyboard: 1-4 to pick, Enter next, Backspace prev
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["1", "2", "3", "4"].includes(e.key)) {
        const c = +e.key - 1;
        if (c < Q.a.length) pick(c);
      } else if (e.key === "Enter" && answers[idx] != null) {
        goNext();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, answers]);

  useEffect(() => () => { if (autoTimer.current) clearTimeout(autoTimer.current); }, []);

  const pct = Math.round(((idx + 1) / QUESTIONS.length) * 100);
  // rocket climb: ground (Q1) -> nearly at the moon (last question)
  const rocketPos = 8 + (idx / Math.max(1, QUESTIONS.length - 1)) * 78;

  return (
    <>
      <div className="quiz-layout">
        <div
          className="rocket-rail"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={QUESTIONS.length}
          aria-valuenow={idx + 1}
          aria-label={`Question ${idx + 1} of ${QUESTIONS.length}`}
        >
          <div className="rr-moon" />
          <div className="rr-line" />
          <div className="rr-trail" style={{ height: `${rocketPos}%` }} />
          <div className="rr-rocket" style={{ bottom: `${rocketPos}%` }} aria-hidden="true">
            🚀
          </div>
          <div className="rr-ground" />
        </div>

        <div className="quiz-main">
          <section className={`stage ${anim}`} key={idx}>
            <div className="progress-meta">
              <span>
                Question <b>{idx + 1}</b> of {QUESTIONS.length}
              </span>
              <span>{pct}% to the moon</span>
            </div>

            <div className="card">
              <span className={`qnum${isSeg ? " seg-tag" : ""}`}>
                {isSeg ? "Quick context" : `Question ${String(idx + 1).padStart(2, "0")}`}
              </span>
              <div className="qtext">{Q.q}</div>
              <div className="options" role="radiogroup" aria-label="Answer options">
                {Q.a.map((text, i) => (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={selected === i}
                    className={`opt${selected === i ? " selected" : ""}`}
                    onClick={() => pick(i)}
                  >
                    <span className="dot" />
                    <span>{text}</span>
                    <span className="kbd">{i + 1}</span>
                  </button>
                ))}
              </div>
              <div className="card-nav">
                <button className="btn btn-ghost" onClick={goPrev}>
                  &larr; Back
                </button>
                <button className="btn btn-primary" onClick={goNext} disabled={selected == null}>
                  {idx === QUESTIONS.length - 1 ? "See my report →" : "Next →"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="coach">
        <div className="bubble">{coachLine(idx)}</div>
        <div className="avatar" title="Your A3 guide">
          <Mascot />
        </div>
      </div>
    </>
  );
}
