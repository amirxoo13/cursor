import { CONTACT_LINKS } from "@/lib/contact";

function IconButton({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("tel:") || href.startsWith("mailto:") ? undefined : "_blank"}
      rel="noreferrer"
      aria-label={label}
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 38,
        height: 38,
        borderRadius: "50%",
        border: "1px solid var(--border)",
        background: "var(--bg-elevated-2)",
        color: "var(--text-dim)",
        transition: "border-color .15s, color .15s",
      }}
      className="social-icon-btn"
    >
      {children}
    </a>
  );
}

export default function SocialIcons({ size = 18 }: { size?: number }) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <IconButton href={CONTACT_LINKS.instagram} label="اینستاگرام">
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      </IconButton>
      <IconButton href={CONTACT_LINKS.whatsapp} label="واتس‌اپ">
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.79.47 3.47 1.29 4.93L2 22l5.29-1.39a9.87 9.87 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.79 14.07c-.24.68-1.4 1.32-1.93 1.4-.5.08-1.12.11-1.81-.11-.42-.13-.95-.31-1.63-.6-2.87-1.24-4.74-4.15-4.88-4.34-.14-.19-1.17-1.55-1.17-2.96s.72-2.1.98-2.39c.26-.29.56-.36.75-.36s.38 0 .54.01c.18.01.4-.07.63.48.24.58.81 2 .88 2.15.07.15.12.32.02.51-.1.19-.15.31-.29.48-.14.17-.3.38-.43.51-.14.14-.29.29-.13.57.17.29.75 1.24 1.61 2.01 1.11.99 2.04 1.3 2.33 1.44.29.14.46.12.63-.07.17-.19.72-.84.91-1.13.19-.29.38-.24.63-.14.26.1 1.65.78 1.93.92.29.14.48.22.55.34.07.13.07.72-.17 1.4Z" />
        </svg>
      </IconButton>
      <IconButton href={CONTACT_LINKS.email} label="ایمیل">
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      </IconButton>
      <IconButton href={CONTACT_LINKS.phone} label="تماس تلفنی">
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4.1c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.4 0 .8-.3 1.1L6.6 10.8Z" />
        </svg>
      </IconButton>

      <style>{`
        .social-icon-btn:hover {
          border-color: var(--gold-dim) !important;
          color: var(--gold-light) !important;
        }
      `}</style>
    </div>
  );
}
