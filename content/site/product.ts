import type { FaqEntry } from "@/components/site/Faq";
import { SIGNUP_PATH } from "@/lib/conversion";

/**
 * The product page: each skill in depth, then the cross-cutting system.
 * Every capability named exists in the web product today. Where something
 * is Professional-only or desktop-only, the copy says so at the point of use.
 */
export const PRODUCT = {
  head: {
    eyebrow: "Product · STANAG 6001 / SLP Levels 2 & 3",
    title: "How SLP Command trains the four skills.",
    lead:
      "For military personnel and candidates preparing the STANAG 6001 / SLP English exam at Levels 2 and 3. Each skill has its own item formats and criteria, Writing and Speaking are rated by AI with the reasoning, and everything you do feeds one measured profile and one daily session.",
    asideLabel: "What the assessment returns · illustrative",
    primary: { href: SIGNUP_PATH, label: "Start training free" },
    secondary: { href: "/pricing", label: "See pricing" },
  },

  skills: [
    {
      key: "reading",
      index: "01",
      name: "Reading",
      modes: ["Practice", "Exam simulation", "Academy", "Intelligence"],
      title: "Level 3 reading is inference, not vocabulary — so that is what gets measured.",
      lead:
        "Passages and questions are served at your target level and tagged by the sub-skill they test. Every answer comes back explained, and the sub-skill profile decides what the Reading Academy teaches next.",
      facts: [
        "Items at your target level, in the text lengths and question shapes the level uses.",
        "Practice: one item at a time, untimed, with the explanation after every answer.",
        "Exam simulation: timed to a published limit derived from the texts actually selected.",
        "Reading Academy: lessons on the sub-skills, recommended from your weakness profile and in full on the free plan.",
        "Reading Intelligence: readiness against the target, a ranked weakness profile with trend, and the one thing to train first.",
      ],
      guide: { href: "/guides/reading", label: "What the reading rater judges" },
    },
    {
      key: "listening",
      index: "02",
      name: "Listening",
      modes: ["Practice", "Exam simulation", "Academy", "Intelligence"],
      title: "No transcript, at exam pace — with the administration policy written down.",
      lead:
        "Audio items with exam-format questions. In practice you control the player. In the exam simulation the number of plays, the seek policy and the time limit follow a published policy derived from the test specification, so the sitting is feasible by construction.",
      facts: [
        "Practice: replay and seek allowed, one item at a time, every answer explained.",
        "Exam simulation: Level 3 items are heard once, Level 2 items twice, with no seeking, and a time limit computed from the audio actually selected.",
        "No transcripts in either mode — you train to catch it the first time.",
        "Listening Academy: free topics on every plan; every topic on Professional.",
        "Listening Intelligence and mastery: which sub-skills are slipping, and when the evidence is out of date.",
      ],
      guide: { href: "/guides/listening", label: "Why listening feels too fast" },
    },
    {
      key: "writing",
      index: "03",
      name: "Writing",
      modes: ["Practice", "Exam simulation", "Quick tools", "Academy", "Intelligence"],
      title: "A training and evaluation workflow, not a grammar checker.",
      lead:
        "Each task is a real brief: an audience, a time limit, a word target and a self-check list. When you submit, the evaluation answers two separate questions — did you do what the task asked, and how well is it written — because a rater would never let one stand in for the other.",
      facts: [
        "The verdict on the task comes first; the examiner's write-up follows, with what to change.",
        "Quick tools between full submissions: sentence feedback, drills and rewrite transforms, on their own monthly allowance.",
        "Exam simulation: a timed task with a word target, evaluated the same way.",
        "Writing Academy: lessons on planning, task control and organisation, in full on the free plan.",
        "Writing learning state: which competencies are secure, emerging, weak or blocking promotion to the target level, with the attempts as evidence.",
        "History: every submission and its evaluation, kept on your account.",
      ],
      guide: { href: "/guides/writing", label: "Why good English still fails" },
    },
    {
      key: "speaking",
      index: "04",
      name: "Speaking",
      modes: ["Practice", "Exam simulation", "Live Coach (Professional)", "History"],
      title: "Rated on the four criteria a rater applies, with the reasoning.",
      lead:
        "Record a response to a task. It is transcribed and judged on Content, Task fulfilment, Accuracy and Text produced, against the standard of the level — and the reasoning is returned with each verdict, so you can see what reached meaning and what did not.",
      facts: [
        "Practice: a task, a recording, four criterion verdicts and the reasoning behind them.",
        "Exam simulation at Level 3: warm-up, preparation time, recorded tasks and examiner follow-ups, driven by the server as one sitting.",
        "Live AI Speaking Coach on Professional: a voice conversation with an AI examiner, 30 minutes a month, in a desktop browser.",
        "History: every attempt and its verdicts.",
      ],
      guide: { href: "/guides/speaking", label: "What a speaking rater is judging" },
    },
  ],

  intelligence: {
    eyebrow: "Intelligence",
    title: "Practice becomes evidence. Evidence becomes a decision.",
    lead:
      "Every rated attempt is an observation: what was asked, at which level, and how it went. Intelligence turns those observations into three things per skill — a readiness score against your target, a weakness profile ranked by severity and trend, and a confidence label — and into one estimated SLP per skill.",
    facts: [
      "Readiness is reported against the level you are training for, not as an abstract score.",
      "Each weakness links to the Academy lesson that addresses it.",
      "Confidence has four settings — Reliable, Fairly reliable, Limited evidence, Out of date — and each skill ages on its own.",
      "The estimate is bounded by what you have demonstrated at that level, never an average across skills.",
      "No pass probability, by design. Nothing here is calibrated against official outcomes.",
    ],
  },

  session: {
    eyebrow: "Today's session",
    title: "The platform tells you what to practise next — and why.",
    lead:
      "The home screen opens on a session composed from your evidence, by published rules: recovery before new material, skills interleaved, never two productive skills back to back, no block longer than half your time. On Professional, the Adaptive Coach adds the priority order, the reasons, the skills to skip today and the coach's own line on the plan.",
    facts: [
      "You choose how long you have; the plan fits it.",
      "Every block names the reason it is there, so you can overrule it knowingly.",
      "Mastery trends on Professional show what moved over 7, 30 and 90 days.",
    ],
  },

  platform: {
    eyebrow: "Platform",
    title: "In the browser today. iOS when it reaches the App Store.",
    facts: [
      { title: "Web application", body: "Runs in a modern browser on a phone, tablet or computer. The live Speaking Coach needs a desktop browser for the microphone session." },
      { title: "One account", body: "Your history, evaluations and estimates live on your account. The iOS app, when released, uses the same login." },
      { title: "Independent and transparent", body: "Not affiliated with NATO, BILC, any Ministry of Defence or any examining body. The evidence standard and the AI's limits are published on the Method page." },
    ],
  },

  faq: [
    {
      q: "Does practice adapt to me?",
      a: [
        "Items are served at your target level, and what the Academy recommends next is chosen from your weakness profile: due review first, then the competency blocking everything else, then what you are ready for. The daily session is composed by published rules from the same evidence. It is targeted and transparent rather than a black box, and it does not claim to be more than that.",
      ],
    },
    {
      q: "Can I see the transcript of a listening item?",
      a: ["No, in either mode — the exam does not provide one, so neither does the trainer. Every answer is explained in practice, which is where the learning happens."],
    },
    {
      q: "How are Writing and Speaking evaluated?",
      a: [
        'By AI models against fixed criteria — the Speaking criteria are Content, Task fulfilment, Accuracy and Text produced — and every verdict is returned with its reasoning. Writing reports the task verdict separately from the write-up. It is indicative guidance for preparation, not an official rating; <a href="/method">How we measure</a> sets out where it is strong and where it is weak.',
      ],
    },
    {
      q: "Does the Speaking Coach work on a phone?",
      a: ["Not yet. The live Coach runs in a desktop browser. Speaking practice and the exam simulation work on a phone."],
    },
    {
      q: "Which target levels can I set?",
      a: ['SLP 2 or SLP 3. Items, simulations and evaluations follow the level you set. See <a href="/slp-2">SLP 2</a> and <a href="/slp-3">SLP 3</a>.'],
    },
    {
      q: "What is included free?",
      a: ['Real allowances in every skill, plus Intelligence, today\'s session and the Reading and Writing Academies in full. <a href="/pricing">Every allowance is listed on the pricing page.</a>'],
    },
  ] satisfies FaqEntry[],

  closing: {
    eyebrow: "Start here",
    title: "Measure all four skills this week.",
    lead: "Start on the free plan and find your weakest digit. No card.",
    primary: { href: SIGNUP_PATH, label: "Start training free" },
    secondary: { href: "/pricing", label: "See pricing" },
    notes: ["Independent trainer — not an official STANAG 6001 assessment"],
  },
};
