import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coach spike",
  robots: { index: false, follow: false },
};

export default function SpikeCoachLayout({ children }: { children: React.ReactNode }) {
  return children;
}
