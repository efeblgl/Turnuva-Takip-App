import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { InitialSplash } from "@/components/InitialSplash";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: {
    default: "Yığılca Futbol Turnuvası",
    template: "%s | Yığılca Futbol Turnuvası",
  },
  description:
    "Yığılca Belediyesi futbol turnuvası: fikstür, puan durumu, takımlar, gol krallığı ve duyurular.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <InitialSplash />
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
