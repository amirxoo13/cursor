import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border-soft)", marginTop: 80 }}>
      <div
        className="container"
        style={{
          padding: "48px 24px 28px",
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
          gap: 32,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Image src="/logo.png" alt="SAMAI" width={34} height={34} style={{ borderRadius: "50%" }} />
            <span style={{ fontWeight: 800, fontSize: 16 }}>
              SAM<span style={{ color: "var(--cyan)" }}>AI</span>
            </span>
          </div>
          <p style={{ color: "var(--text-dim)", fontSize: 13.5, lineHeight: 1.9, maxWidth: 320 }}>
            Smart Attorney Mind — پلتفرم پرسش‌وپاسخ هوشمند قوانین مهاجرتی اتحادیه
            اروپا و آمریکا، بر پایه اسناد رسمی و هوش مصنوعی.
          </p>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: "var(--text)" }}>
            پلتفرم
          </div>
          <FooterLink href="/">خانه</FooterLink>
          <FooterLink href="/chat">پرسش‌وپاسخ</FooterLink>
          <FooterLink href="/sources">منابع و روش‌شناسی</FooterLink>
          <FooterLink href="/about">درباره ما</FooterLink>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: "var(--text)" }}>
            منابع رسمی
          </div>
          <FooterLink href="https://ecfr.federalregister.gov" external>
            eCFR
          </FooterLink>
          <FooterLink href="https://www.federalregister.gov" external>
            Federal Register
          </FooterLink>
          <FooterLink href="https://www.courtlistener.com" external>
            CourtListener
          </FooterLink>
          <FooterLink href="https://eur-lex.europa.eu" external>
            EUR-Lex
          </FooterLink>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: "var(--text)" }}>
            ارتباط
          </div>
          <FooterLink href="/contact">تماس با ما</FooterLink>
          <FooterLink href="mailto:contact@samai.legal" external>
            contact@samai.legal
          </FooterLink>
        </div>
      </div>

      <div
        style={{
          borderTop: "1px solid var(--border-soft)",
          padding: "18px 24px",
          textAlign: "center",
          fontSize: 12.5,
          color: "var(--text-faint)",
        }}
      >
        © {new Date().getFullYear()} SAMAI — Smart Attorney Mind. پاسخ‌های این پلتفرم جایگزین
        مشاوره حقوقی رسمی نیستند.
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
  external,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  const style: React.CSSProperties = {
    display: "block",
    color: "var(--text-dim)",
    fontSize: 13.5,
    padding: "6px 0",
  };
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" style={style}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} style={style}>
      {children}
    </Link>
  );
}
