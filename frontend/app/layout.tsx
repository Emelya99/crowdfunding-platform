import { BASE_METADATA } from "@/constants/seo";
import { Manrope } from "next/font/google";
import "@/styles/globals.css";
import Header from "@/components/layout/header";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata = {
  title: BASE_METADATA.title,
  description: BASE_METADATA.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} antialiased`}>
        <Header />
        <main className="py-10">{children}</main>
      </body>
    </html>
  );
}
