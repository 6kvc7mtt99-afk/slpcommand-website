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

/**
 * Free-plan allowances exactly as the pricing section states them.
 *
 * `examPerMonth` is ONE PER SKILL, not one in total — the credits are separate
 * features in the database (`reading_exam_simulation`,
 * `listening_exam_simulation` and, since EXAM-QUOTA-SPEAKING-001,
 * `speaking_exam_simulation`), each with its own counter. The old copy said
 * "1 full exam / month" and undersold the plan by two thirds: a learner could
 * always sit one of each, and telling them otherwise made Free look thinner
 * than it is at the exact moment they were deciding whether to sign up.
 */
export const FREE_PLAN_QUOTAS = {
  readingPerWeek: 10,
  listeningPerWeek: 10,
  writingPerMonth: 3,
  speakingPerMonth: 3,
  /** Per skill, per month — all four skills now have their own credit. */
  examPerMonthPerSkill: 1,
  examSkills: ["Reading", "Listening", "Writing", "Speaking"],
  /**
   * WRITING-QUOTA-SPLIT-001 — sentence feedback, drills and rewrite
   * transforms left the 3/month essay bucket. They cost a tenth of a full
   * correction, and sharing one price with it was making a rational Free
   * learner hoard credits and never touch the tools that build the habit.
   */
  writingMicroPerMonth: 30,
} as const;

export const SIGNUP_PATH = "/signup";

export const CONVERSION_CTA: Record<"en" | "es", ConversionCta> = {
  en: {
    heading: "Measure your profile before the board does",
    body:
      "The free plan is real practice, not a locked demo: 10 Reading and 10 Listening sessions a week, 3 AI-scored Writing submissions and 3 Speaking evaluations a month, 30 quick Writing tools a month, and one full exam simulation a month in each of the four skills. The Intelligence dashboard and the Reading and Writing Academies are included in full.",
    href: SIGNUP_PATH,
    label: "Start free",
    note: "No card required. Independent trainer — not an official STANAG 6001 assessment.",
  },
  es: {
    heading: "Mide tu perfil antes de que lo haga el tribunal",
    body:
      "El plan gratuito es práctica real, no una demo bloqueada: 10 sesiones de Reading y 10 de Listening por semana, 3 redacciones y 3 evaluaciones de Speaking corregidas con IA al mes, 30 usos al mes de las herramientas rápidas de Writing, y un simulacro de examen completo al mes en cada una de las cuatro destrezas. El panel de Intelligence y las Academies de Reading y Writing están incluidos íntegramente.",
    href: SIGNUP_PATH,
    label: "Empieza gratis",
    note: "Sin tarjeta. Entrenador independiente — no es una evaluación oficial STANAG 6001.",
  },
};

export function conversionCta(lang: "en" | "es"): ConversionCta {
  return CONVERSION_CTA[lang];
}
