import { FREE_PLAN_QUOTAS, SIGNUP_PATH } from "@/lib/conversion";
import type { FaqEntry } from "@/components/site/Faq";

/**
 * The two plans as sold. Every allowance is read from `lib/conversion.ts`,
 * which is pinned to the production quota table, so this file cannot quote a
 * number the product does not give. The price is claim C06 in the registry.
 */
export const PRO_PLAN = {
  name: "Professional",
  shortName: "Pro",
  price: "€9.99",
  period: "month",
} as const;

export type PlanRow = { label: string; free: string; pro: string; proHighlight?: boolean };

const q = FREE_PLAN_QUOTAS;

export const PLAN_ROWS: { group: string; rows: PlanRow[] }[] = [
  {
    group: "Practice",
    rows: [
      { label: "Reading practice", free: `${q.readingPerWeek} / week`, pro: "Unlimited", proHighlight: true },
      { label: "Listening practice", free: `${q.listeningPerWeek} / week`, pro: "Unlimited", proHighlight: true },
      { label: "Writing drafting", free: "Unlimited", pro: "Unlimited" },
      { label: "Speaking recording", free: "Unlimited", pro: "Unlimited" },
    ],
  },
  {
    group: "AI evaluation",
    rows: [
      { label: "Writing evaluation (task verdict + examiner write-up)", free: `${q.writingPerMonth} / month`, pro: "Unlimited", proHighlight: true },
      { label: "Quick Writing tools (sentence feedback, drills, rewrites)", free: `${q.writingMicroPerMonth} / month`, pro: "Unlimited", proHighlight: true },
      { label: "Speaking evaluation (four criteria, with reasoning)", free: `${q.speakingPerMonth} / month`, pro: "Unlimited", proHighlight: true },
    ],
  },
  {
    group: "Exam simulation",
    rows: [
      { label: "Timed, full-length simulation — each of the four skills", free: `${q.examPerMonthPerSkill} / month per skill`, pro: "Unlimited", proHighlight: true },
    ],
  },
  {
    group: "Intelligence and coaching",
    rows: [
      { label: "Estimated SLP per skill, with confidence", free: "Included", pro: "Included" },
      { label: "Readiness score and ranked weakness profile", free: "Included", pro: "Included" },
      { label: "Today's session — a plan built from your evidence", free: "Included", pro: "Included" },
      { label: "Adaptive Coach — priority order, what to skip, the coach's own line", free: "—", pro: "Included", proHighlight: true },
      { label: "Mastery trends over 7, 30 and 90 days", free: "—", pro: "Included", proHighlight: true },
    ],
  },
  {
    group: "Academy",
    rows: [
      { label: "Reading Academy and Writing Academy", free: "Included in full", pro: "Included in full" },
      { label: "Listening Academy", free: "Free topics", pro: "Every topic", proHighlight: true },
    ],
  },
  {
    group: "Live AI Speaking Coach",
    rows: [
      { label: "Live voice conversation with an AI examiner (desktop browser)", free: "—", pro: "30 min / month", proHighlight: true },
    ],
  },
];

/** Compact card view of the same facts, for the homepage and the top of /pricing. */
export const PLAN_CARDS = {
  free: {
    name: "Free",
    price: "€0",
    period: "month",
    description: "Real practice in every skill, with allowances. Enough to find your weakest digit.",
    features: [
      { label: "Reading practice", value: `${q.readingPerWeek} / week` },
      { label: "Listening practice", value: `${q.listeningPerWeek} / week` },
      { label: "Writing, AI-evaluated", value: `${q.writingPerMonth} / month` },
      { label: "Quick Writing tools", value: `${q.writingMicroPerMonth} / month` },
      { label: "Speaking, AI-evaluated", value: `${q.speakingPerMonth} / month` },
      { label: "Exam simulation", value: `${q.examPerMonthPerSkill} / month per skill` },
      { label: "Intelligence, today's session, Reading & Writing Academy", value: "Included" },
    ],
    cta: { href: SIGNUP_PATH, label: "Start free" },
    fine: "No card required.",
  },
  pro: {
    name: PRO_PLAN.name,
    price: PRO_PLAN.price,
    period: PRO_PLAN.period,
    description: "The caps come off, and the platform tells you what to do first — and what to skip.",
    features: [
      { label: "Reading & Listening practice", value: "Unlimited" },
      { label: "Writing & Speaking evaluation", value: "Unlimited" },
      { label: "Exam simulation, every skill", value: "Unlimited" },
      { label: "Adaptive Coach & mastery trends", value: "Included" },
      { label: "Listening Academy", value: "Every topic" },
      { label: "Live AI Speaking Coach", value: "30 min / month" },
    ],
    cta: { href: SIGNUP_PATH, label: "Start free, then upgrade" },
    fine: "Create a free account, then upgrade from Subscription inside the app. Billed monthly; cancel anytime.",
  },
} as const;

export const PRICING_NOTE =
  "Payment on the web is by card through a secure hosted checkout. The iOS app is not on the App Store yet. Coach minutes are per month and do not carry over. Independent trainer — not an official STANAG 6001 assessment.";

export const PRICING_FAQ: FaqEntry[] = [
  {
    q: "Is the free plan a trial?",
    a: [
      `No. It does not expire and it needs no card. It has allowances — ${q.readingPerWeek} Reading and ${q.listeningPerWeek} Listening sessions a week, ${q.writingPerMonth} Writing and ${q.speakingPerMonth} Speaking evaluations a month, ${q.writingMicroPerMonth} quick Writing tools a month, and one timed exam simulation a month in each skill — and everything else, including Intelligence and today's session, is open.`,
    ],
  },
  {
    q: "What exactly does Professional add?",
    a: [
      "The allowances come off Reading and Listening practice, Writing and Speaking evaluation and exam simulation. Two coaching layers are added: the Adaptive Coach, which ranks what to train first, says what to skip today and explains why, and mastery trends over 7, 30 and 90 days. The Listening Academy opens in full, and the live AI Speaking Coach becomes available for 30 minutes a month.",
    ],
  },
  {
    q: "How do I pay, and how do I cancel?",
    a: [
      "Create a free account, then open Subscription inside the app. Payment on the web is by card through a secure hosted checkout, and your plan updates once the receipt reaches your account. Professional is billed monthly until you cancel, which you can do from your account at any time. Your history and results stay on the account whichever plan you are on.",
    ],
  },
  {
    q: "Does “unlimited” really mean unlimited?",
    a: [
      "For practice, evaluation and exam simulation, yes: there is no hidden cap. The one exception is stated on the card — the live AI Speaking Coach is metered at 30 minutes a month, because a live voice session has a real per-minute cost. Unused minutes do not carry over.",
    ],
  },
  {
    q: "Can I use the same account on the iOS app?",
    a: [
      "The iOS app is not on the App Store yet. When it is, it will use the same account, so anything you do on the web now carries over.",
    ],
  },
  {
    q: "We are an academy or a unit. Is there a group plan?",
    a: [
      'Not as a self-serve plan yet. Organisation workspaces are in early access with a small number of academies. See <a href="/academies">SLP Command for academies</a> and write to us.',
    ],
  },
];
