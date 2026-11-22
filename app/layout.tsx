import type { Metadata } from "next";
import "./globals.css";

const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "Synergy Foods";

export const metadata: Metadata = {
  title: `${storeName} | Good food starts here`,
  description:
    "Fresh, quality Nigerian foodstuff, carefully selected and delivered to your home.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
