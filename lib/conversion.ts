/**
 * The one conversion action every public authority page offers.
 *
 * Phase-1 shipped twelve indexable pages whose calls to action all pointed at
 * `/#pricing`, `/#features` or another article. The site's only transactional
 * CTA — "Get Professional in the app" — points at `/support`, and the iOS app is
 * still "coming to the App Store". So organic traffic had nowhere to convert,
 * while a working free web signup sat at `/signup`, unlinked from every one of
 * them.
 *
 * Every fact below is checked against the live pricing section in
 * `content/landing.html` by `tests/unit/conversion.test.ts`. Free-plan quotas
 * are claim C07 in docs/growth/03_CLAIMS_REGISTRY.md; "no card" is verified by
 * `app/signup/page.tsx` having no payment step. If pricing changes, the test
 * fails before the page can lie.
 */

export type ConversionCta = {
  heading: string;
  body: string;
  href: string;
  label: string;
  /** Reassurance under the button. Must stay literally true. */
  note: string;
};

/** Free-plan allowances exactly as the pricing section states them. */
export const FREE_PLAN_QUOTAS = {
  readingPerWeek: 10,
  listeningPerWeek: 10,
  writingPerMonth: 3,
  speakingPerMonth: 3,
  examPerMonth: 1,
} as const;

export const SIGNUP_PATH = "/signup";

export const CONVERSION_CTA: Record<"en" | "es", ConversionCta> = {
  en: {
    heading: "Measure your profile before the board does",
    body:
      "The free plan is real practice, not a locked demo: 10 Reading and 10 Listening sessions a week, 3 AI-scored Writing submissions and 3 Speaking evaluations a month, and one full exam simulation a month. Academy and the Intelligence dashboard are included.",
    href: SIGNUP_PATH,
    label: "Start free",
    note: "No card required. Independent trainer — not an official STANAG 6001 assessment.",
  },
  es: {
    heading: "Mide tu perfil antes de que lo haga el tribunal",
    body:
      "El plan gratuito es práctica real, no una demo bloqueada: 10 sesiones de Reading y 10 de Listening por semana, 3 redacciones y 3 evaluaciones de Speaking corregidas con IA al mes, y un simulacro de examen completo al mes. Academy y el panel de Intelligence están incluidos.",
    href: SIGNUP_PATH,
    label: "Empieza gratis",
    note: "Sin tarjeta. Entrenador independiente — no es una evaluación oficial STANAG 6001.",
  },
};

export function conversionCta(lang: "en" | "es"): ConversionCta {
  return CONVERSION_CTA[lang];
}
