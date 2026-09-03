import type { FaqEntry } from "@/components/site/Faq";
import type { LoopNode } from "@/components/site/visuals/TrainingLoop";
import { FREE_PLAN_QUOTAS, SIGNUP_PATH } from "@/lib/conversion";

/**
 * Homepage copy. Every capability named here exists in the web product
 * today; tests/unit/publicClaims.test.ts scans the rendered page against the
 * claims registry, and the product-truth notes in the audit record where
 * each statement was verified.
 */

const q = FREE_PLAN_QUOTAS;

export const HOME = {
  hero: {
    eyebrow: "STANAG 6001 · SLP Levels 2 & 3 · For military personnel and SLP candidates",
    title: "SLP preparation, measured skill by skill.",
    lead:
      "Specialised preparation for the STANAG 6001 / SLP English exam at Levels 2 and 3. Practise all four skills, get Writing and Speaking rated by AI against the exam's criteria, and know which digit to train next.",
    primary: { href: SIGNUP_PATH, label: "Start training free" },
    secondary: { href: "/product", label: "See how it works" },
    notes: ["No card required", "Runs in your browser today", "iOS app coming to the App Store", "Independent, built in Spain"],
    caption:
      "Illustrative profile. Each skill is measured on its own. Requirements are set per digit, so the lowest digit decides whether a profile meets them.",
  },

  problem: {
    eyebrow: "The problem",
    title: "General English practice does not prepare you for an SLP board.",
    lead: "The exam rates specific performances at a specific level. Most preparation never measures them.",
    items: [
      {
        title: "Preparation is fragmented",
        body: "A course, an app, a folder of old papers. None of them shares a record of what you can actually do, so every session starts with no information.",
      },
      {
        title: "General English is not the construct",
        body: "STANAG 6001 rates task performance, the text you produce and accuracy at a level. A vocabulary streak moves none of those.",
      },
      {
        title: "One number hides the weak skill",
        body: "A profile is four digits and requirements are set per digit: a 3332 does not meet a 3333 requirement. An overall score cannot tell you which digit to fix.",
      },
      {
        title: "Feedback arrives too late to act on",
        body: "A written task corrected a week later teaches little. Without a fast loop you cannot tell whether a change worked before the next attempt.",
      },
    ],
  },

  system: {
    eyebrow: "The system",
    title: "One preparation system, built around the exam.",
    lead: "Practice produces evidence. Evidence becomes a measured profile. The profile decides what you train next, and each session feeds the one after it.",
    nodes: [
      { index: "01", title: "Practice", body: "Level-specific items in all four skills, in practice and exam modes." },
      { index: "02", title: "Assessment", body: "Answers are scored. Writing and Speaking are rated by AI against the exam's criteria, with the reasoning." },
      { index: "03", title: "Performance intelligence", body: "Readiness, ranked weaknesses and a confidence label per skill, from your own attempts." },
      { index: "04", title: "Targeted improvement", body: "A daily session and Academy lessons chosen from the weakness profile, not from a syllabus." },
      { index: "05", title: "Progress", body: "An estimated SLP per skill that moves only on evidence, and says when the evidence is thin." },
    ] satisfies LoopNode[],
    returnLabel: "feeds the next session",
  },

  skills: {
    eyebrow: "Four skills",
    title: "Each skill trained against what its rater actually applies.",
    lead: "Not four copies of one exercise bank. Each skill has its own item formats, its own criteria and its own evidence.",
    items: [
      {
        key: "reading",
        name: "Reading",
        modes: "Practice · Exam · Academy",
        points: [
          "Passages and questions served at your target level — not one difficulty slider with the numbers moved.",
          "Every answer explained, so a wrong inference is corrected rather than just marked.",
          "A weakness profile by sub-skill — gist, specific detail, inference — that decides what the Academy recommends.",
        ],
        guide: "/guides/reading",
      },
      {
        key: "listening",
        name: "Listening",
        modes: "Practice · Exam · Academy",
        points: [
          "Audio items with exam-format questions and no transcript, in practice or under exam conditions.",
          "In practice you control the player. In the exam, plays and seeking follow a published administration policy derived from the test specification.",
          "The profile shows which listening sub-skills are slipping, and when the evidence has gone out of date.",
        ],
        guide: "/guides/listening",
      },
      {
        key: "writing",
        name: "Writing",
        modes: "Practice · Exam · Tools · Academy",
        points: [
          "Real task briefs: audience, time limit, word target and a self-check list before you submit.",
          "AI evaluation returns a verdict on the task first, then the examiner's write-up. Good English on the wrong task is not credited as good English on the right one.",
          "Quick tools for sentence feedback, drills and rewrites between full submissions, and a learning state that tracks which writing competencies are secure, emerging or blocking promotion.",
        ],
        guide: "/guides/writing",
      },
      {
        key: "speaking",
        name: "Speaking",
        modes: "Practice · Exam · Live Coach",
        points: [
          "Record a response; it is transcribed and rated on the four assessment criteria — Content, Task fulfilment, Accuracy, Text produced — with the reasoning.",
          "For a Level 3 target, the exam simulation runs a full sitting: warm-up, preparation time, recorded tasks and examiner follow-ups.",
          "A live AI Speaking Coach for conversation practice, on Professional: 30 minutes a month, in a desktop browser.",
        ],
        guide: "/guides/speaking",
      },
    ],
  },

  stage: {
    eyebrow: "Intelligence and today's session",
    title: "More practice is not better. Better-directed practice is.",
    flow: ["Practice", "Evaluate", "Understand", "Improve"],
    lead:
      "Every rated attempt becomes evidence. Intelligence turns it into a readiness score against your target, a weakness profile ranked with its trend, and a confidence label that says how far to trust each figure — then composes today's session from the same evidence, by published rules, with the reason for every block.",
    panels: {
      brief: { index: "What is wrong", caption: "Reading Intelligence" },
      plan: { index: "What to do today", caption: "Today's session" },
      join: "becomes",
    },
    facts: [
      "Readiness per skill against your target, computed from your own attempts.",
      "Weaknesses ranked by severity and trend, each linked to the Academy lesson that addresses it.",
      "Confidence stated on every estimate: Reliable, Fairly reliable, Limited evidence, Out of date.",
      "A session composed by published rules: recovery before new material, skills interleaved, never two productive skills back to back, no block longer than half your time.",
      "On Professional the plan also ranks what to do first and why, and names the skills to skip today.",
      "No pass probability — deliberately. Nothing here is calibrated against official results, so no percentage is invented.",
    ],
  },

  exam: {
    eyebrow: "Under exam conditions",
    title: "Full-length, timed simulations in every skill.",
    lead:
      "Practice teaches. Exam mode measures. Simulations follow the format of your target level — SLP 2 and SLP 3 separately — and evidence produced under timing counts for more in your estimate.",
    facts: [
      "Reading and Listening: timed to a published limit derived from the items actually selected, with Listening plays and seeking restricted.",
      "Writing: a timed task with a word target, evaluated the same way as practice — task first, then the write-up.",
      "Speaking at Level 3: warm-up, preparation, recorded tasks and examiner follow-ups, driven by the server.",
    ],
    link: { href: "/exam", label: "What the exam simulation is for" },
  },

  audience: {
    eyebrow: "Who it is for",
    title: "Built for people whose next posting depends on four digits.",
    items: [
      { title: "Military personnel with an SLP requirement", body: "Serving members who need to reach or renew a Standardized Language Profile for a posting, a course or a promotion board." },
      { title: "Candidates preparing on their own", body: "People sitting a national STANAG 6001 English test at Level 2 or 3 without a course, who need structure and honest measurement." },
      { title: "Professionals in NATO-related roles", body: "Civilian and defence staff whose role calls for a STANAG 6001 profile, at the professional level the job actually uses." },
      { title: "Academies and training organisations", body: "Language schools and training units preparing cohorts of candidates, who need to see where each student stands.", href: "/academies" },
    ],
  },

  academies: {
    eyebrow: "For academies",
    title: "The same measurement, across a cohort.",
    body:
      "An organisation workspace — student management, groups, invitations, per-student progress and weakness profiles, Writing oversight, reports and alerts — is in early access with a small number of academies. It is not self-serve yet.",
    cta: { href: "/academies", label: "SLP Command for academies" },
    contact: { href: "/academies#contact", label: "Ask about early access" },
  },

  trust: {
    eyebrow: "Trust",
    title: "Credible because it is measured. Honest about what it will not claim.",
    lead: "Built and operated independently from Spain, against the published STANAG 6001 descriptors, with no institutional ties. Six rules hold everywhere in the product.",
    principles: [
      { title: "Nothing is asserted without measurement", body: "If there is not enough evidence about a sub-skill, the product says so and shows how much is missing." },
      { title: "Every recommendation names its evidence", body: "“Train this next” arrives with the attempts that produced it: how many, from which skills, and what changed." },
      { title: "Strengths do not cancel weaknesses", body: "Levels are not averages. The level you are shown is bounded by what you have demonstrated at that level." },
      { title: "Confidence is reported, not hidden", body: "Every estimate carries how certain it is and what would make it more certain." },
      { title: "A decline is a fact, not a judgement", body: "Skills fade when unused. A drop is reported as a drop, because a platform that hides it is not measuring." },
      { title: "The task is judged separately from the language", body: "A fluent response to a different question cannot be credited as an answer to the one that was set." },
    ],
    refusals: [
      { label: "No official status", body: "Not NATO, not BILC, not a Ministry of Defence, not an examining body." },
      { label: "No pass probability", body: "No percentage, no traffic light. Nothing to calibrate one against." },
      { label: "No guaranteed result", body: "No product can promise a language exam." },
      { label: "No endorsements", body: "No unit, school or officer has endorsed this product." },
    ],
    links: [
      { href: "/method", label: "How we measure" },
      { href: "/trust-center", label: "Trust Center" },
      { href: "/ai-usage", label: "Responsible AI" },
    ],
  },

  pricing: {
    eyebrow: "Pricing",
    title: "Free measures all four skills. Professional removes the caps.",
    lead: "Same trainer, same criteria, at SLP 2 or SLP 3. You pay for volume and coaching, not for a different exam.",
    link: { href: "/pricing", label: "Compare every allowance" },
  },

  faq: [
    {
      q: "Is SLP Command an official STANAG 6001 assessment?",
      a: [
        "No. SLP Command is an independent educational platform. It is not affiliated with NATO, BILC, any Ministry of Defence or any examining body, and its AI feedback is indicative guidance for preparation, not an official rating.",
      ],
    },
    {
      q: "Which levels and skills does it cover?",
      a: [
        'SLP Level 2 and SLP Level 3, in all four skills: Reading, Listening, Writing and Speaking. You set a target level and every item, simulation and evaluation follows that level\'s format and criteria. See <a href="/slp-2">what SLP 2 requires</a> and <a href="/slp-3">what SLP 3 requires</a>.',
      ],
    },
    {
      q: "What does the free plan include?",
      a: [
        `${q.readingPerWeek} Reading and ${q.listeningPerWeek} Listening practice sessions a week, ${q.writingPerMonth} AI-evaluated Writing submissions and ${q.speakingPerMonth} Speaking evaluations a month, ${q.writingMicroPerMonth} quick Writing tools a month, and one timed exam simulation a month in each of the four skills. Intelligence, today's session and the Reading and Writing Academies are included in full. No card, no expiry.`,
      ],
    },
    {
      q: "How reliable is the AI feedback?",
      a: [
        'Writing and Speaking are evaluated by AI models against fixed criteria, and every rating comes back with the reasoning that produced it, so you can disagree on specifics. It is reasonable at task performance, organisation and consistency of accuracy, and weaker on borderline calls and the conventions of a particular national paper. Where evidence is thin the product says "limited evidence" rather than inventing a number. <a href="/method">How we measure</a> sets out the limits in full.',
      ],
    },
    {
      q: "Will it tell me my chance of passing?",
      a: [
        "No, and this is deliberate. The platform can tell you what your evidence supports, how confident it is, and how far that is from your target level. A percentage would require calibration against official outcomes that it does not hold, and people make career decisions on that number.",
      ],
    },
    {
      q: "Does it work on my phone?",
      a: [
        "The web app runs in a modern browser on a phone, tablet or computer, and your account holds your history wherever you sign in. The live AI Speaking Coach needs a desktop browser. An iOS app is coming to the App Store and will use the same account.",
      ],
    },
    {
      q: "Can I cancel Professional at any time?",
      a: [
        'Yes. Professional is billed monthly until you cancel from your account, and your practice history and results stay on the account. Payment on the web is by card through a secure hosted checkout. See <a href="/pricing">pricing</a>.',
      ],
    },
  ] satisfies FaqEntry[],

  closing: {
    eyebrow: "Start here",
    title: "Find your weakest digit this week.",
    lead: `Start on the free plan: ${q.readingPerWeek} Reading and ${q.listeningPerWeek} Listening sessions a week, ${q.writingPerMonth} evaluated writings and ${q.speakingPerMonth} speakings a month, one timed simulation per skill. No card.`,
    primary: { href: SIGNUP_PATH, label: "Start training free" },
    secondary: { href: "/pricing", label: "See pricing" },
    notes: ["Independent trainer — not an official STANAG 6001 assessment"],
  },
};
