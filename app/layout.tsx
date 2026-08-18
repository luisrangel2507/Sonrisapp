import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SonrisApp",
  description: "Panel clínico y de lealtad para tu consultorio dental.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
