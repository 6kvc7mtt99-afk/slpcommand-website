import type { FaqEntry } from "@/components/site/Faq";

/**
 * SLP Command for academies and training organisations.
 *
 * Organisation tooling exists in the product (workspaces, groups, invitations,
 * per-student views, reports, alerts, branding) but self-serve provisioning is
 * off and nothing is sold against it. This page says so plainly: early access,
 * by arrangement, with the capabilities described as what a participating
 * organisation gets today.
 */
export const ACADEMIES = {
  head: {
    eyebrow: "For academies and training organisations",
    title: "Train a cohort the way the exam measures it.",
    lead:
      "The same trainer your candidates would use on their own, inside an organisation workspace where instructors can see where each student stands, which skill is holding each profile back, and what changed this week. In early access with a small number of academies.",
    primary: { href: "#contact", label: "Ask about early access" },
    secondary: { href: "/product", label: "See the trainer" },
    notes: ["Early access, by arrangement", "Not self-serve yet", "No public organisation pricing"],
  },

  status: {
    eyebrow: "Where this stands",
    title: "What exists today, and what does not.",
    exists: [
      "An organisation workspace with its own members, roles and audit trail.",
      "Students and groups: assign, move and rename cohorts.",
      "Invitations by email, with the outcome reported honestly.",
      "Per-student progress: estimated SLP per skill, confidence, the weakness profile and recent activity.",
      "Reports across the cohort: engagement, work completed, proficiency, Writing, by group.",
      "Alerts when a student needs attention.",
      "Organisation branding and a custom domain for the login screen.",
    ],
    notYet: [
      "Self-serve sign-up and provisioning — workspaces are created by arrangement.",
      "Public organisation pricing and seat management at scale.",
      "Instructor-authored content and assignments.",
    ],
  },

  how: {
    eyebrow: "How it works",
    title: "Learners train. Instructors see measurement, not busywork.",
    steps: [
      { title: "Learners use the same trainer", body: "Practice, evaluation, exam simulation and intelligence, exactly as an individual account — nothing is diluted for a cohort." },
      { title: "Evidence rolls up", body: "Every rated attempt feeds the student's own profile and the organisation's reports, with the same confidence labels." },
      { title: "Instructors direct attention", body: "The cohort view ranks who needs attention and why; the student view shows the weakness profile and the Writing evaluations." },
      { title: "Nothing is invented for the report", body: "No pass probability, no averaged score. Where evidence is thin, the report says so." },
    ],
  },

  audience: {
    eyebrow: "Who this is for",
    items: [
      { title: "Language academies preparing SLP candidates", body: "Schools running STANAG 6001 preparation courses who want measurement between classes, not just in them." },
      { title: "Military training units and schools", body: "Units preparing personnel for a national sitting, who need to see readiness per skill across a group." },
      { title: "Training providers to defence and NATO-related staff", body: "Organisations whose clients need a professional-level profile for a role." },
    ],
  },

  faq: [
    {
      q: "Is there an organisation plan I can buy today?",
      a: ["Not as a self-serve plan. Workspaces are provisioned by arrangement during early access, and pricing is agreed per organisation. Write to us with the size of your cohort and the levels you prepare."],
    },
    {
      q: "Do students need their own accounts?",
      a: ["Yes. Each learner has an account and joins the organisation by invitation. Their history stays theirs."],
    },
    {
      q: "What can an instructor see?",
      a: ["The cohort view, each student's estimated SLP per skill with confidence, their weakness profile and recent activity, their Writing evaluations, and reports across the organisation. Instructors do not see a pass probability, because there is none."],
    },
    {
      q: "Can we use our own branding?",
      a: ["Organisation branding and a custom domain for the login screen exist today. Instructor-authored content does not, yet."],
    },
  ] satisfies FaqEntry[],

  /**
   * The next action. There is no form backend and no sales desk, and this
   * page does not pretend otherwise: early access is arranged by email, at
   * the general contact address the Legal Notice and Contact page publish.
   * The mailto carries the context that lets us reply usefully.
   */
  contact: {
    eyebrow: "Early access",
    title: "Interested in bringing SLP Command to an academy or training group?",
    body:
      "Write to us. Workspaces are provisioned by arrangement during early access, and we reply in English or Spanish. The details on the right let us answer with something concrete rather than a brochure.",
    email: "contact@slpcommand.com",
    subject: "SLP Command for academies — early access",
    fields: [
      { label: "Academy or institution", hint: "Name and country" },
      { label: "Approximate number of students", hint: "Per intake or per year" },
      { label: "Target SLP levels", hint: "2, 3, or both" },
      { label: "Next sitting", hint: "Approximate date, if known" },
      { label: "Early access", hint: "Whether you want to take part now" },
    ],
    primaryLabel: "Email contact@slpcommand.com",
    secondary: { href: "/method", label: "How we measure" },
    notes: ["Early access, by arrangement", "Independent — not an official STANAG 6001 assessment"],
  },
};
