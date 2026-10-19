import "./style.css";
import type { Metadata } from "next";
import { SiteHeader } from "../components/site-header";
import { SiteLanguage } from "../components/site-language";

export const metadata: Metadata = {
  title: "Zam Zam Water | Tumkur",
  description: "Order fresh drinking water in Tumkur with easy doorstep delivery",
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SiteLanguage />
        <SiteHeader />

        <main>{children}</main>

        <footer>
          <span>© {new Date().getFullYear()} Zam Zam Water · Tumkur</span>
          <span>
            Developed by <a href="https://cubixtop.com" target="_blank" rel="noopener noreferrer">Cubixtop</a>
          </span>
        </footer>

        <a
          className="whatsapp"
          href="https://wa.me/917019454218"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
        >
          WhatsApp Chat ↗
        </a>
      </body>
    </html>
  );
}
