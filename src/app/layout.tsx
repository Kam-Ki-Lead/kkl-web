import type { Metadata } from "next";
import { Archivo, Public_Sans, IBM_Plex_Mono } from "next/font/google";
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
    <html lang="en" className={`${archivo.variable} ${publicSans.variable} ${plexMono.variable}`}>
      <body>
        <SampleModeBanner />
        {children}
      </body>
    </html>
  );
}
