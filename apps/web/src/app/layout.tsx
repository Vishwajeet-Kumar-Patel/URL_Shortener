import { Suspense } from "react";
import { ReferralTracker } from "@/components/marketing/referral-tracker";
import "./globals.css";

export const metadata = {
  title: "Purplemerit Link Shortener",
  description: "Shorten, monetize, and scale your links globally."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth" data-scroll-behavior="smooth">
      <body className="antialiased">
        <Suspense fallback={null}>
          <ReferralTracker />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
