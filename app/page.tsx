"use client";

import { useCallback, useState } from "react";
import type { Lead, RealData } from "@/lib/types";
import { QUESTIONS } from "@/lib/questions";
import { computeQuizScore, getSegment } from "@/lib/scoring";
import Intro from "@/components/Intro";
import Quiz from "@/components/Quiz";
import Capture from "@/components/Capture";
import Analyzing from "@/components/Analyzing";
import Results from "@/components/Results";
import Evidence from "@/components/Evidence";

type Stage = "intro" | "quiz" | "capture" | "analyzing" | "results" | "evidence";

const blankAnswers = () => new Array(QUESTIONS.length).fill(null) as (number | null)[];
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Page() {
  const [stage, setStage] = useState<Stage>("intro");
  const [answers, setAnswers] = useState<(number | null)[]>(blankAnswers);
  const [lead, setLead] = useState<Lead | null>(null);
  const [real, setReal] = useState<RealData | null>(null);
  const [launching, setLaunching] = useState(false);
  const [toast, setToast] = useState<{ msg: string; show: boolean }>({ msg: "", show: false });

  const showToast = useCallback((msg: string) => {
    setToast({ msg, show: true });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 2800);
  }, []);

  const start = () => {
    setAnswers(blankAnswers());
    setReal(null);
    setStage("quiz");
  };

  const selectAnswer = (idx: number, choice: number) =>
    setAnswers((a) => {
      const next = a.slice();
      next[idx] = choice;
      return next;
    });

  const runAnalysis = useCallback(
    async (l: Lead) => {
      setLead(l);
      setLaunching(false);
      setStage("analyzing");

      // fire-and-forget lead capture (server forwards to webhook if configured)
      fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead: l,
          quizScore: computeQuizScore(answers),
          segment: getSegment(answers),
          source: "visibility-analyzer",
        }),
      }).catch(() => {});

      const analyze = (async (): Promise<RealData | null> => {
        try {
          const r = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: l.website, brand: l.dealership, city: l.city }),
          });
          const j = await r.json();
          if (j.ok && j.data) return j.data as RealData;
          return null;
        } catch {
          return null;
        }
      })();

      // keep the analyzing animation on screen for a beat
      const [data] = await Promise.all([analyze, delay(2600)]);
      if (data) setReal(data);
      else {
        setReal(null);
        showToast("Live lookup unavailable, scoring from your answers");
      }
      // launch SAGGY's rocket up to the moon, then reveal the score
      setLaunching(true);
      await delay(1000);
      setStage("results");
    },
    [answers, showToast]
  );

  const retake = () => {
    setAnswers(blankAnswers());
    setLead(null);
    setReal(null);
    setStage("intro");
  };

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="A3 Brands — Automotive SEO Experts" className="brand-logo" />
        </div>
        <span className="pill-tag">Dealer Visibility Analyzer</span>
      </div>

      {stage === "intro" && <Intro onStart={start} />}
      {stage === "quiz" && (
        <Quiz
          answers={answers}
          onSelect={selectAnswer}
          onComplete={() => setStage("capture")}
          onBackToIntro={() => setStage("intro")}
        />
      )}
      {stage === "capture" && (
        <Capture
          previewScore={computeQuizScore(answers)}
          onBack={() => setStage("quiz")}
          onSubmit={runAnalysis}
        />
      )}
      {stage === "analyzing" && <Analyzing launching={launching} />}
      {stage === "results" && (
        <Results
          answers={answers}
          lead={lead}
          real={real}
          onRetake={retake}
          onViewEvidence={() => setStage("evidence")}
        />
      )}
      {stage === "evidence" && (
        <Evidence answers={answers} lead={lead} real={real} onBack={() => setStage("results")} />
      )}

      <div className={`toast${toast.show ? " show" : ""}`}>
        <span className="ck">✓</span>
        <span>{toast.msg}</span>
      </div>
    </div>
  );
}
