import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "AI Agent Suite | LangChain + LangGraph + LangSmith",
  description:
    "5 specialized AI agents powered by LangChain.js, LangGraph, LangSmith, and Anthropic Claude",
  keywords: ["AI", "LangChain", "LangGraph", "LangSmith", "Claude", "TypeScript"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
