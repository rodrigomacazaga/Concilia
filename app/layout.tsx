import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Juliet - Your AI-Powered Development Assistant",
  description: "AI-powered development environment with multi-provider support (Claude, Gemini, GPT), persistent memory, and intelligent code assistance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
