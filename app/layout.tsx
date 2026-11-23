import type { Metadata } from "next";
import { StoreHeader } from "@/components/StoreHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "E-book Store — historias que te acompañan",
  description: "Descubre nuevas lecturas, compra libros electrónicos y disfruta tu biblioteca desde cualquier lugar.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <StoreHeader />
        {children}
      </body>
    </html>
  );
}
