import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Sidebar from "../components/Sidebar";
import ThemeProvider from "../components/ThemeProvider";
import ClinicOptionsProvider from "../components/ClinicOptionsProvider";
import "./globals.css";
import layoutStyles from "./layout.module.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dentora Patient Records",
  description: "Local patient records handler built with Next.js",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <ThemeProvider>
          <ClinicOptionsProvider>
            <div className={layoutStyles.shell}>
              <Sidebar />
              <div className={layoutStyles.content}>{children}</div>
            </div>
          </ClinicOptionsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
