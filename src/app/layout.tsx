import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "FinanceOS — Controle Financeiro Inteligente",
    template: "%s | FinanceOS",
  },
  description:
    "Substitua suas planilhas por uma plataforma financeira inteligente. Controle entradas, saídas, metas e investimentos com a precisão de um CFO.",
  keywords: ["controle financeiro", "gestão financeira", "finanças pessoais", "fluxo de caixa"],
  authors: [{ name: "FinanceOS" }],
  openGraph: {
    title: "FinanceOS — Controle Financeiro Inteligente",
    description: "Substitua suas planilhas por uma plataforma financeira inteligente.",
    type: "website",
    locale: "pt_BR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthSessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange={false}
          >
            {children}
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
