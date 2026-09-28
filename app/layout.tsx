import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { jsonLdNegocio, NEGOCIO } from "./lib/negocio";
import { Geist, Geist_Mono, Quicksand, Fredoka } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(NEGOCIO.sitio),
  // El título lleva el rubro y la ciudad: es lo que se busca ("vivero Talca"),
  // y es la línea azul que se lee en los resultados de Google.
  title: {
    default: "Milokira · Vivero y venta de plantas en Talca, Región del Maule",
    template: "%s · Milokira",
  },
  description:
    "Vivero en Talca: plantas de interior, suculentas y cactus con despacho a domicilio en Talca y envíos a todo Chile. Mira el catálogo y consulta por WhatsApp.",
  keywords: [
    "vivero Talca",
    "viveros en Talca",
    "plantas Talca",
    "vivero Región del Maule",
    "plantas de interior Talca",
    "suculentas Talca",
    "cactus Talca",
    "venta de plantas Talca",
    "despacho de plantas Talca",
  ],
  authors: [{ name: "Milokira" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: NEGOCIO.sitio,
    siteName: "Milokira",
    title: "Milokira · Vivero y venta de plantas en Talca",
    description:
      "Plantas de interior, suculentas y cactus. Despacho en Talca y envíos a todo Chile.",
    images: [{ url: "/img/logo.png", width: 512, height: 512, alt: "Milokira" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Milokira · Vivero y venta de plantas en Talca",
    description:
      "Plantas de interior, suculentas y cactus. Despacho en Talca y envíos a todo Chile.",
    images: ["/img/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-CL">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${quicksand.variable} ${fredoka.variable} antialiased`}
      >
        {children}
        {/* Le dice a Google que esto es un vivero en Talca, no un sitio
            cualquiera: es lo que habilita el resultado enriquecido local. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLdNegocio()),
          }}
        />
        <Analytics />
      </body>
    </html>
  );
}
