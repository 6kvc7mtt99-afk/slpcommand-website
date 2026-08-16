import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false }, title: "Choose your target level" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
