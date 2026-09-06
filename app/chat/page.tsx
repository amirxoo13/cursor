"use client";

import { useState, useRef, useEffect } from "react";
import { COUNTRY_LABEL_FA, COUNTRIES_WITH_COVERAGE } from "@/lib/countries";

interface ChatTurn {
  question: string;
  countryValue: string;
  thinking?: string;
  answer?: string;
  error?: string;
  loading?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "شرایط گرین کارت خانوادگی چیه؟",
  "برای پناهندگی در آلمان چه مدارکی لازمه؟",
  "مهلت اعتراض به رد درخواست ویزا در آمریکا چقدره؟",
  "شرایط ویزای کار H-1B چیست؟",
  "روند رسیدگی به درخواست پناهندگی در اتحادیه اروپا چطوره؟",
];

function flagEmoji(iso2: string): string {
  const codePoints = [...iso2.toUpperCase()].map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// اول گزینه‌های عمومی، بعد کشورهایی که واقعاً در دیتابیس داده دارند
// (مرتب‌شده با اولویت پوشش بیشتر: آمریکا و آلمان اول)
const PRIORITY_COUNTRIES = ["US", "DE", "NL", "ES"];
const COUNTRY_OPTIONS = [
  { value: "ALL", label: "🌍 همه کشورها" },
  ...PRIORITY_COUNTRIES.map((c) => ({ value: c, label: `${flagEmoji(c)} ${COUNTRY_LABEL_FA[c]}` })),
  { value: "EU_GENERAL", label: "🇪🇺 قوانین عمومی اتحادیه اروپا" },
  ...COUNTRIES_WITH_COVERAGE.filter((c) => !PRIORITY_COUNTRIES.includes(c))
    .sort((a, b) => (COUNTRY_LABEL_FA[a] || a).localeCompare(COUNTRY_LABEL_FA[b] || b, "fa"))
    .map((c) => ({ value: c, label: `${flagEmoji(c)} ${COUNTRY_LABEL_FA[c] || c}` })),
];

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [country, setCountry] = useState("ALL");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (turns.length === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns]);

  async function ask(question: string) {
    if (!question.trim()) return;
    setInput("");
    setTurns((prev) => [...prev, { question, countryValue: country, loading: true }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          country: country === "ALL" ? undefined : country,
        }),
      });

      // پاسخ موفق به‌صورت استریم NDJSON برمی‌گردد (نه متن خام، نه JSON یک‌جا) —
      // هر خط یک شیء {"t":"r"|"c","d":"..."} است. "r" یعنی تکه‌ای از فکرکردنِ
      // زنده‌ی مدل (نمایش داده می‌شود تا کاربر مطمئن شود مدل واقعاً دارد کار
      // می‌کند، نه اینکه یک پیام ثابت و بی‌حرکت ببیند)، "c" یعنی تکه‌ای از
      // جواب نهایی. فقط خطاها JSON معمولی (یک‌جا، نه استریم) هستند.
      if (!res.ok || !res.body) {
        let message = "خطای ناشناخته";
        try {
          const data = await res.json();
          message = data.error || message;
        } catch {
          // بدنه JSON نبود؛ همان پیام پیش‌فرض استفاده می‌شود
        }
        setTurns((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], error: message, loading: false };
          return next;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let lineBuffer = "";
      let thinkingSoFar = "";
      let answerSoFar = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let parsed: { t?: string; d?: string };
          try {
            parsed = JSON.parse(line);
          } catch {
            continue;
          }
          if (parsed.t === "r" && typeof parsed.d === "string") {
            thinkingSoFar += parsed.d;
          } else if (parsed.t === "c" && typeof parsed.d === "string") {
            answerSoFar += parsed.d;
          }
        }
        setTurns((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            ...next[next.length - 1],
            // تا وقتی جواب واقعی شروع نشده، همچنان loading می‌ماند (تا حباب
            // متن فکرکردن به‌جای حباب پاسخ نهایی نمایش داده شود)
            loading: answerSoFar.length === 0,
            thinking: thinkingSoFar || undefined,
            answer: answerSoFar || undefined,
          };
          return next;
        });
      }
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
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: "var(--text)" }}>
              کشور موردنظرت رو انتخاب کن
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginBottom: 12, lineHeight: 1.8 }}>
              پاسخ‌ها بر اساس قوانین همون کشور جست‌وجو می‌شوند.
            </div>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              style={{
                width: "100%",
                padding: "11px 12px",
                borderRadius: 10,
                border: "1px solid var(--gold-dim)",
                background: "rgba(217,178,92,0.08)",
                color: "var(--gold-light)",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {COUNTRY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} style={{ background: "var(--bg-elevated)", color: "var(--text)" }}>
                  {opt.label}
                </option>
              ))}
            </select>
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
                  turn.thinking ? (
                    <div
                      style={{
                        alignSelf: "flex-start",
                        background: "var(--bg-elevated-2)",
                        border: "1px dashed var(--gold-dim)",
                        borderRadius: "16px 16px 16px 3px",
                        padding: "13px 16px",
                        maxWidth: "90%",
                        fontSize: 13.5,
                        lineHeight: 1.9,
                        color: "var(--text-dim)",
                        fontStyle: "italic",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontStyle: "normal" }}>
                        <span className="pulse-dot" />
                        <span style={{ fontWeight: 700, color: "var(--gold-light)", fontSize: 12.5 }}>
                          🤔 در حال فکر کردن...
                        </span>
                      </div>
                      {turn.thinking}
                    </div>
                  ) : (
                    <div style={{ color: "var(--text-dim)", fontSize: 13.5, display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="pulse-dot" /> در حال جست‌وجو در منابع رسمی...
                    </div>
                  )
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
