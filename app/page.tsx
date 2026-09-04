"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatResponseSource } from "./api/chat/route";

interface ChatTurn {
  question: string;
  answer?: string;
  sources?: ChatResponseSource[];
  error?: string;
  loading?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "شرایط گرین کارت خانوادگی چیه؟",
  "برای پناهندگی در آلمان چه مدارکی لازمه؟",
  "مهلت اعتراض به رد درخواست ویزا در آمریکا چقدره؟",
];

const jurisdictionLabel: Record<string, string> = {
  US: "آمریکا",
  EU: "اتحادیه اروپا",
};

const sourceLabel: Record<string, string> = {
  ecfr: "eCFR",
  federal_register: "Federal Register",
  courtlistener: "CourtListener",
  eurlex: "EUR-Lex",
};

export default function Home() {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  async function ask(question: string) {
    if (!question.trim()) return;
    setInput("");
    setTurns((prev) => [...prev, { question, loading: true }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();

      setTurns((prev) => {
        const next = [...prev];
        const idx = next.length - 1;
        if (!res.ok) {
          next[idx] = { question, error: data.error || "خطای ناشناخته" };
        } else {
          next[idx] = { question, answer: data.answer, sources: data.sources };
        }
        return next;
      });
    } catch (err: any) {
      setTurns((prev) => {
        const next = [...prev];
        next[next.length - 1] = { question, error: err?.message || "خطای شبکه" };
        return next;
      });
    }
  }

  return (
    <main
      style={{
        maxWidth: 820,
        margin: "0 auto",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "0 16px",
      }}
    >
      <header style={{ padding: "24px 0 16px", borderBottom: "1px solid var(--border)" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
          پرسش‌وپاسخ قوانین مهاجرتی
        </h1>
        <p style={{ color: "var(--text-dim)", fontSize: 14, marginTop: 6 }}>
          سؤال‌های خودت درباره قوانین مهاجرتی اتحادیه اروپا و آمریکا رو بپرس — پاسخ‌ها
          بر اساس متن‌های رسمی (eCFR، Federal Register، CourtListener، EUR-Lex) تولید می‌شن.
        </p>
      </header>

      <div style={{ flex: 1, padding: "24px 0", display: "flex", flexDirection: "column", gap: 20 }}>
        {turns.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ color: "var(--text-dim)", fontSize: 14 }}>چند نمونه سؤال:</p>
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => ask(q)}
                style={{
                  textAlign: "right",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  color: "var(--text)",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {turns.map((turn, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                alignSelf: "flex-end",
                background: "var(--user-bubble)",
                color: "white",
                borderRadius: "14px 14px 2px 14px",
                padding: "10px 14px",
                maxWidth: "85%",
                fontSize: 15,
              }}
            >
              {turn.question}
            </div>

            {turn.loading && (
              <div style={{ color: "var(--text-dim)", fontSize: 14 }}>در حال جست‌وجو در منابع رسمی و تولید پاسخ...</div>
            )}

            {turn.error && (
              <div
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid var(--danger)",
                  color: "#fca5a5",
                  borderRadius: 10,
                  padding: "12px 14px",
                  fontSize: 14,
                  whiteSpace: "pre-wrap",
                }}
              >
                خطا: {turn.error}
              </div>
            )}

            {turn.answer && (
              <div
                style={{
                  alignSelf: "flex-start",
                  background: "var(--assistant-bubble)",
                  border: "1px solid var(--border)",
                  borderRadius: "14px 14px 14px 2px",
                  padding: "14px 16px",
                  maxWidth: "95%",
                  fontSize: 15,
                  lineHeight: 1.9,
                  whiteSpace: "pre-wrap",
                }}
              >
                {turn.answer}

                {turn.sources && turn.sources.length > 0 && (
                  <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                    <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 6 }}>
                      منابع:
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {turn.sources.map((s) => (
                        <a
                          key={s.id}
                          href={s.sourceUrl ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: 12,
                            color: "var(--accent)",
                            textDecoration: "none",
                          }}
                        >
                          [{sourceLabel[s.source] ?? s.source} · {jurisdictionLabel[s.jurisdiction] ?? s.jurisdiction}]{" "}
                          {s.sectionReference || s.title || "منبع"}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        style={{
          position: "sticky",
          bottom: 0,
          background: "var(--bg)",
          padding: "16px 0",
          display: "flex",
          gap: 8,
          borderTop: "1px solid var(--border)",
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="سؤالت را درباره قوانین مهاجرتی بنویس..."
          style={{
            flex: 1,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "12px 14px",
            color: "var(--text)",
            fontSize: 15,
          }}
        />
        <button
          type="submit"
          style={{
            background: "var(--accent)",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: "0 20px",
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          پرسیدن
        </button>
      </form>

      <footer style={{ padding: "0 0 20px", textAlign: "center", fontSize: 12, color: "var(--text-dim)" }}>
        این پاسخ‌ها جایگزین مشاوره حقوقی رسمی نیستند.
      </footer>
    </main>
  );
}
