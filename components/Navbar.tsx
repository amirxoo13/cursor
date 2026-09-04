"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "خانه" },
  { href: "/chat", label: "پرسش‌وپاسخ" },
  { href: "/sources", label: "منابع و روش‌شناسی" },
  { href: "/about", label: "درباره ما" },
  { href: "/contact", label: "تماس" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "blur(14px)",
        background: "rgba(5, 7, 13, 0.72)",
        borderBottom: "1px solid var(--border-soft)",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 72,
        }}
      >
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 12 }}
          onClick={() => setOpen(false)}
        >
          <Image
            src="/logo.png"
            alt="SAMAI"
            width={42}
            height={42}
            style={{ borderRadius: "50%", boxShadow: "0 0 0 1px rgba(217,178,92,0.35)" }}
            priority
          />
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
            <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "0.02em" }}>
              SAM<span style={{ color: "var(--cyan)" }}>AI</span>
            </span>
            <span style={{ fontSize: 10.5, color: "var(--text-faint)" }}>
              Smart Attorney Mind
            </span>
          </span>
        </Link>

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
          className="nav-desktop"
        >
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding: "9px 16px",
                  borderRadius: 10,
                  fontSize: 14.5,
                  fontWeight: 500,
                  color: active ? "var(--gold-light)" : "var(--text-dim)",
                  background: active ? "rgba(217,178,92,0.09)" : "transparent",
                }}
              >
                {link.label}
              </Link>
            );
          })}
          <Link href="/chat" className="btn btn-primary" style={{ marginRight: 12, padding: "10px 20px", fontSize: 14 }}>
            شروع پرسش
          </Link>
        </nav>

        <button
          className="nav-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-label="منو"
          style={{
            display: "none",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--text)",
            width: 40,
            height: 40,
          }}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <div
          className="nav-mobile-panel"
          style={{
            borderTop: "1px solid var(--border-soft)",
            padding: "12px 24px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              style={{
                padding: "12px 8px",
                borderRadius: 8,
                color: pathname === link.href ? "var(--gold-light)" : "var(--text)",
                fontSize: 15,
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 860px) {
          .nav-desktop { display: none !important; }
          .nav-toggle { display: flex !important; align-items: center; justify-content: center; }
        }
        @media (min-width: 861px) {
          .nav-mobile-panel { display: none !important; }
        }
      `}</style>
    </header>
  );
}
