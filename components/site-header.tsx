"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./theme-toggle";

type Language = "en" | "hi" | "kn";

const navigationLabels: Record<Language, { order: string; track: string; admin: string }> = {
  en: { order: "Order Now", track: "Track Order", admin: "Admin" },
  hi: { order: "अभी ऑर्डर करें", track: "ऑर्डर ट्रैक करें", admin: "एडमिन" },
  kn: { order: "ಈಗ ಆರ್ಡರ್ ಮಾಡಿ", track: "ಆರ್ಡರ್ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ", admin: "ನಿರ್ವಹಣೆ" },
};

const languageNames: Record<Language, string> = {
  en: "English",
  hi: "हिन्दी",
  kn: "ಕನ್ನಡ",
};

export function SiteHeader() {
  const pathname = usePathname();
  const [language, setLanguage] = useState<Language>("en");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("zamzam-language");
    if (savedLanguage === "en" || savedLanguage === "hi" || savedLanguage === "kn") {
      setLanguage(savedLanguage);
      document.documentElement.lang = savedLanguage;
    }
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function changeLanguage(value: string) {
    if (value !== "en" && value !== "hi" && value !== "kn") return;
    setLanguage(value);
    window.localStorage.setItem("zamzam-language", value);
    document.documentElement.lang = value;
    window.dispatchEvent(new CustomEvent("zamzam-language-change", { detail: value }));
  }

  const labels = navigationLabels[language];

  return (
    <header className="header">
      <Link href="/" className="brand" aria-label="Zam Zam Water home">
        <img src="/logo.png" alt="Zam Zam Water, Tumkur" className="brand-logo" />
      </Link>

      <Link className="order-now-link" href="/order#mobile-check">
        {labels.order}
      </Link>

      <button
        type="button"
        className="menu-toggle"
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={menuOpen}
        aria-controls="site-navigation"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span />
        <span />
        <span />
      </button>

      <nav id="site-navigation" className={`site-nav${menuOpen ? " is-open" : ""}`}>
        <Link href="/track" onClick={() => setMenuOpen(false)}>{labels.track}</Link>
        {pathname.startsWith("/admin") && <Link href="/admin" onClick={() => setMenuOpen(false)}>{labels.admin}</Link>}
        <div className="site-nav-tools">
          <label className="language-picker">
            <span className="sr-only">Choose language</span>
            <select
              value={language}
              onChange={(event) => changeLanguage(event.target.value)}
              aria-label="Choose language"
            >
              {(Object.keys(languageNames) as Language[]).map((key) => (
                <option key={key} value={key}>{languageNames[key]}</option>
              ))}
            </select>
          </label>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
