"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatResponseSource } from "@/app/api/chat/route";

interface ChatTurn {
  question: string;
  jurisdiction: Jurisdiction;
  answer?: string;
  sources?: ChatResponseSource[];
  error?: string;
  loading?: boolean;
}

type Jurisdiction = "ALL" | "US" | "EU";

const SUGGESTED_QUESTIONS = [
  "شرایط گرین کارت خانوادگی چیه؟",
  "برای پناهندگی در آلمان چه مدارکی لازمه؟",
  "مهلت اعتراض به رد درخواست ویزا در آمریکا چقدره؟",
  "شرایط ویزای کار H-1B چیست؟",
  "روند رسیدگی به درخواست پناهندگی در اتحادیه اروپا چطوره؟",
];

const JURISDICTIONS: { key: Jurisdiction; label: string }[] = [
  { key: "ALL", label: "همه حوزه‌ها" },
  { key: "US", label: "🇺🇸 آمریکا" },
  { key: "EU", label: "🇪🇺 اتحادیه اروپا" },
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

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>("ALL");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  async function ask(question: string) {
    if (!question.trim()) return;
    setInput("");
    setTurns((prev) => [...prev, { question, jurisdiction, loading: true }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          jurisdiction: jurisdiction === "ALL" ? undefined : jurisdiction,
        }),
      });
      const data = await res.json();

      setTurns((prev) => {
        const next = [...prev];
        const idx = next.length - 1;
        if (!res.ok) {
          next[idx] = { ...next[idx], error: data.error || "خطای ناشناخته", loading: false };
        } else {
          next[idx] = { ...next[idx], answer: data.answer, sources: data.sources, loading: false };
        }
        return next;
      });
    } catch (err: any) {
      setTurns((prev) => {
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], error: err?.message || "خطای شبکه", loading: false };
        return next;
      });
    }
  }

  return (
    <main className="container" style={{ paddingTop: 32, paddingBottom: 40 }}>
      <div className="chat-layout" style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 28 }}>
        {/* SIDEBAR */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--text)" }}>
              حوزه قضایی
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {JURISDICTIONS.map((j) => (
                <button
                  key={j.key}
                  onClick={() => setJurisdiction(j.key)}
                  style={{
                    textAlign: "right",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid",
                    borderColor: jurisdiction === j.key ? "var(--gold-dim)" : "var(--border)",
                    background: jurisdiction === j.key ? "rgba(217,178,92,0.1)" : "transparent",
                    color: jurisdiction === j.key ? "var(--gold-light)" : "var(--text-dim)",
                    fontSize: 13.5,
                    cursor: "pointer",
                  }}
                >
                  {j.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card sidebar-suggestions" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--text)" }}>
              نمونه سؤال‌ها
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  style={{
                    textAlign: "right",
                    background: "var(--bg-elevated-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    color: "var(--text-dim)",
                    cursor: "pointer",
                    fontSize: 13,
                    lineHeight: 1.7,
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 12, color: "var(--text-faint)", lineHeight: 1.9, padding: "0 4px" }}>
            پاسخ‌های SAMAI بر اساس متن قوانین رسمی تولید می‌شوند و جایگزین
            مشاوره حقوقی رسمی نیستند.
          </div>
        </aside>

        {/* CHAT PANEL */}
        <section className="card" style={{ display: "flex", flexDirection: "column", minHeight: "70vh", overflow: "hidden" }}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)" }}>
            <h1 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>پرسش‌وپاسخ حقوقی</h1>
            <p style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 4 }}>
              پاسخ‌ها با جست‌وجوی برداری در اسناد رسمی و تولید با Qwen3.8-Max ساخته می‌شوند.
            </p>
          </div>

          <div style={{ flex: 1, padding: "22px", display: "flex", flexDirection: "column", gap: 22, overflowY: "auto" }}>
            {turns.length === 0 && (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-faint)",
                  fontSize: 14,
                  gap: 10,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 34 }}>⚖️</div>
                سؤالت را درباره قوانین مهاجرتی بنویس یا یکی از نمونه‌سؤال‌های کناری را انتخاب کن.
              </div>
            )}

            {turns.map((turn, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div
                  style={{
                    alignSelf: "flex-end",
                    background: "var(--user-bubble)",
                    color: "white",
                    borderRadius: "16px 16px 3px 16px",
                    padding: "11px 16px",
                    maxWidth: "82%",
                    fontSize: 14.5,
                  }}
                >
                  {turn.question}
                </div>

                {turn.loading && (
                  <div style={{ color: "var(--text-dim)", fontSize: 13.5, display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="pulse-dot" /> در حال جست‌وجو در منابع رسمی و تولید پاسخ...
                  </div>
                )}

                {turn.error && (
                  <div
                    style={{
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid var(--danger)",
                      color: "#fca5a5",
                      borderRadius: 10,
                      padding: "12px 14px",
                      fontSize: 13.5,
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
                      borderRadius: "16px 16px 16px 3px",
                      padding: "16px 18px",
                      maxWidth: "95%",
                      fontSize: 14.5,
                      lineHeight: 2,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {turn.answer}

                    {turn.sources && turn.sources.length > 0 && (
                      <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                        <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginBottom: 8, fontWeight: 600 }}>
                          منابع بازیابی‌شده
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {turn.sources.map((s) => (
                            <a
                              key={s.id}
                              href={s.sourceUrl ?? undefined}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: 12, color: "var(--cyan)" }}
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
              display: "flex",
              gap: 10,
              padding: 16,
              borderTop: "1px solid var(--border)",
              background: "var(--bg-panel)",
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
                padding: "13px 16px",
                color: "var(--text)",
                fontSize: 14.5,
              }}
            />
            <button type="submit" className="btn btn-primary">
              پرسیدن
            </button>
          </form>
        </section>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .chat-layout { grid-template-columns: 1fr !important; }
          .sidebar-suggestions { order: 2; }
        }
        .pulse-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--cyan);
          box-shadow: 0 0 0 0 rgba(52,214,232,0.6);
          animation: pulse 1.4s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(52,214,232,0.5); }
          70% { box-shadow: 0 0 0 8px rgba(52,214,232,0); }
          100% { box-shadow: 0 0 0 0 rgba(52,214,232,0); }
        }
      `}</style>
    </main>
  );
}
