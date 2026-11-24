import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/providers/Web3Provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "AI Wallet Copilot ($COAI) | แซวกระเป๋า BNB Chain ด้วย AI",
  description:
    "แค่แปะ Address รู้นิสัยการเทรด ป้องกันสินทรัพย์ และลุยเชนใหม่ด้วย AI ไม่ต้องเชื่อมต่อกระเป๋าสำหรับการใช้งานพื้นฐาน",
  openGraph: {
    title: "AI Wallet Copilot ($COAI) — Roast My Wallet",
    description:
      "แปะ Public Address บน BNB Smart Chain ให้ AI แฉนิสัยการเทรดแบบจุกๆ พร้อมปลดล็อก Pro Trading Coach ด้วย $COAI",
    images: ["/api/og?lang=th"],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Wallet Copilot ($COAI) — Roast My Wallet",
    description:
      "แค่แปะ Public Address บน BNB Smart Chain ให้ AI แฉนิสัยการเทรดแบบไม่ต้องต่อกระเป๋า!",
    images: ["/api/og?lang=th"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansThai.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-50 selection:bg-emerald-500 selection:text-slate-950">
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
