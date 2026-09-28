import type { Metadata } from "next";
import { Brand } from "@/components/Brand";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "APGI Training",
    template: "%s | APGI Training"
  },
  description: "Responsive VPSHR learning units for the APGI training platform."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="app-header">
          <Brand href="/" />
          <ThemeToggle />
        </header>
        {children}
      </body>
    </html>
  );
}
