import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import HomePage from "@/app/page";
import ProductPage from "@/app/product/page";
import PricingPage from "@/app/pricing/page";
import AcademiesPage from "@/app/academies/page";

/**
 * The four marketing pages, rendered exactly as a crawler would receive
 * them. Copy tests scan this markup rather than the content modules, so a
 * claim introduced in a component (not just in content/site/*) is caught too.
 */
export const MARKETING_RENDERS: { path: string; html: string }[] = [
  { path: "/", html: renderToStaticMarkup(createElement(HomePage)) },
  { path: "/product", html: renderToStaticMarkup(createElement(ProductPage)) },
  { path: "/pricing", html: renderToStaticMarkup(createElement(PricingPage)) },
  { path: "/academies", html: renderToStaticMarkup(createElement(AcademiesPage)) },
];

/** Visible text only: no tags, no JSON-LD scripts, whitespace collapsed. */
export function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
