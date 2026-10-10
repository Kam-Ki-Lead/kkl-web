import type { Metadata } from "next";
import { Archivo, Public_Sans, IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { SampleModeBanner } from "@/components/system/sample-mode-banner";
import "./globals.css";

/* C-02: Archivo for headings and numbers, Public Sans for body, IBM Plex Mono for
   references and masked values. Self-hosted by next/font — no runtime CDN request. */
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-archivo",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-public-sans",
  display: "swap",
});

/*
 * The public header's typeface.
 *
 * Self-hosted by next/font, which emits a size-adjusted local fallback, so
 * the bar does not reflow when the web font arrives — the "no layout shift
 * while the web font loads" requirement. Loaded as a variable font, so the
 * 500/600/700 the header uses cost one file rather than three. Scoped to the
 * header through --font-jakarta; the rest of the application keeps Archivo
 * and Public Sans.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Kaam Ki Lead",
    template: "%s · Kaam Ki Lead",
  },
  description:
    "Buy real estate leads with Kaam Ki Lead. A lead marketplace for brokers, agencies and builders, with purchase requests by area and buyer requirements.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${publicSans.variable} ${plexMono.variable} ${jakarta.variable}`}>
      <body>
        <SampleModeBanner />
        {children}
      </body>
    </html>
  );
}
