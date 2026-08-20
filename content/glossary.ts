/**
 * Glossary of STANAG 6001 / SLP terms.
 *
 * Every entry carries a `status` because the single most useful thing this page
 * can do — for a candidate and for a model citing it — is separate three things
 * the rest of the internet routinely blurs:
 *
 *   official        what the standard or its custodian actually says
 *   interpretation  how testing practice and this site read that standard
 *   product         a decision SLP Command made, which nobody else is bound by
 *
 * A glossary that presents all three in the same voice is how "SLP Command says
 * X" turns into "STANAG requires X" three citations later. Do not add an entry
 * whose status you cannot honestly pick.
 */

export type GlossaryStatus = "official" | "interpretation" | "product";

export type GlossaryTerm = {
  /** Anchor id. Stable — other pages deep-link to it. */
  id: string;
  term: string;
  /** Other names a candidate may search for. */
  aka?: string[];
  status: GlossaryStatus;
  /** One self-contained sentence. This is the part worth quoting. */
  short: string;
  /** Optional expansion. Plain HTML, same conventions as the authority pages. */
  body?: string;
  see?: { href: string; label: string }[];
};

export const GLOSSARY_STATUS_LABEL: Record<GlossaryStatus, string> = {
  official: "Official",
  interpretation: "Educational interpretation",
  product: "SLP Command decision",
};

export const GLOSSARY_STATUS_NOTE: Record<GlossaryStatus, string> = {
  official: "Stated by the standard or its custodian.",
  interpretation: "How testing practice and this site read the standard. Not a rule.",
  product: "A choice this product made. Not a requirement of the exam.",
};

export const GLOSSARY: GlossaryTerm[] = [
  {
    id: "stanag-6001",
    term: "STANAG 6001",
    aka: ["Standardization Agreement 6001"],
    status: "official",
    short:
      "The NATO-agreed standard that describes language proficiency on a scale of levels, used to write curricula, develop tests, and record and report a person's ability in four skills.",
    body: `<p>It describes <em>what a level means</em>. It does not supply one exam paper that every member nation sits — each nation builds its own test against the descriptors, so one nation's Level 3 paper is not automatically another's.</p>`,
    see: [
      { href: "/stanag-6001", label: "What STANAG 6001 is" },
      { href: "/slp", label: "How to read an SLP" },
    ],
  },
  {
    id: "slp",
    term: "SLP — Standardized Language Profile",
    aka: ["SLP", "language profile", "four-digit profile"],
    status: "official",
    short:
      "The record of one person's proficiency in one language, written as four digits in the fixed order Listening, Speaking, Reading, Writing.",
    body: `<p>The order is <strong>L-S-R-W</strong>, not alphabetical and not the order most courses teach in. A profile is four separate judgements reported together — never an average, and never a single overall score.</p>
<p>In English-language sources "SLP" also stands for speech-language pathology. That field is unrelated to this one.</p>`,
    see: [
      { href: "/slp", label: "SLP means Standardized Language Profile" },
      { href: "/glossary#listening", label: "Listening" },
    ],
  },
  {
    id: "bilc",
    term: "BILC",
    aka: ["Bureau for International Language Coordination"],
    status: "official",
    short:
      "The NATO body associated with STANAG 6001, which publishes information about the standard and coordinates language-testing practice between member nations.",
    body: `<p>BILC's public pages describe Edition 5 as the agreed edition for proficiency levels. SLP Command cites BILC. It is not affiliated with BILC and holds no accreditation from it.</p>`,
    see: [{ href: "/stanag-6001", label: "STANAG 6001" }],
  },
  {
    id: "level-2",
    term: "Level 2",
    aka: ["SLP Level 2", "STANAG Level 2", "functional", "limited working proficiency"],
    status: "official",
    short:
      "Limited working proficiency: able to handle routine social and workplace language on familiar topics, getting the facts reliably but not the implication, the hedge or the joke.",
    body: `<p>Level 2 is a real achievement and the stated minimum for many roles. It is not "Level 3 with fewer adjectives" — the difference is the kind of thinking the language has to carry, not the amount of vocabulary.</p>`,
    see: [{ href: "/slp-2", label: "What SLP 2 requires" }],
  },
  {
    id: "level-3",
    term: "Level 3",
    aka: ["SLP Level 3", "STANAG Level 3", "professional", "minimum professional proficiency"],
    status: "official",
    short:
      "Professional proficiency: able to handle abstract topics, argument, implication and unexpected turns, with the precision a professional exchange needs.",
    body: `<p>This is the level most candidates underestimate. The jump from 2 to 3 is a change of task, not a longer word list: at 3 you are asked to reason, qualify and take a position, not to report facts accurately.</p>`,
    see: [{ href: "/slp-3", label: "The jump to SLP 3" }],
  },
  {
    id: "slp-2222",
    term: "SLP 2222",
    aka: ["2222"],
    status: "official",
    short: "A profile of Level 2 in all four skills: Listening 2, Speaking 2, Reading 2, Writing 2.",
    body: `<p>Not "an average of 2". Each digit is a separate judgement, and a posting that requires 2222 usually requires every digit to reach 2.</p>`,
    see: [
      { href: "/slp-2", label: "SLP 2" },
      { href: "/es/slp-2", label: "SLP 2222 en español" },
    ],
  },
  {
    id: "slp-3333",
    term: "SLP 3333",
    aka: ["3333"],
    status: "official",
    short: "A profile of Level 3 in all four skills: Listening 3, Speaking 3, Reading 3, Writing 3.",
    body: `<p>Because every digit must stand on its own, the skill you avoid training is the one that decides whether you hold 3333 or 3323.</p>`,
    see: [
      { href: "/slp-3", label: "SLP 3" },
      { href: "/es/slp-3", label: "SLP 3333 en español" },
    ],
  },
  {
    id: "listening",
    term: "Listening",
    aka: ["comprensión oral"],
    status: "official",
    short: "The first digit of an SLP: understanding spoken language, at the speed and in the conditions the level describes.",
    body: `<p>Rated on what you can follow in real time — connected speech, numbers, polarity, the speaker's stance — rather than on how many words you could define if the recording stopped.</p>`,
    see: [{ href: "/guides/listening", label: "Why listening feels too fast" }],
  },
  {
    id: "speaking",
    term: "Speaking",
    aka: ["expresión oral"],
    status: "official",
    short: "The second digit of an SLP: producing spoken language that performs the task the level requires.",
    body: `<p>A speaking rating is about what your speech accomplishes — describing, narrating, arguing, qualifying — not only about accent or fluency.</p>`,
    see: [{ href: "/guides/speaking", label: "What speaking is rated on" }],
  },
  {
    id: "reading",
    term: "Reading",
    aka: ["comprensión escrita"],
    status: "official",
    short: "The third digit of an SLP: understanding written texts of the type and difficulty the level describes.",
    body: `<p>At Level 2 the work is mostly locating what a text states. At Level 3 it is reconstructing what a text argues, including what it implies without saying.</p>`,
    see: [{ href: "/guides/reading", label: "Why Level 3 reading is inference" }],
  },
  {
    id: "writing",
    term: "Writing",
    aka: ["expresión escrita"],
    status: "official",
    short: "The fourth digit of an SLP: producing written text that does the job the task sets, at the level's standard of accuracy and organisation.",
    body: `<p>Good English on the wrong brief is the most common way a strong writer scores below their level.</p>`,
    see: [{ href: "/guides/writing", label: "Why good English still fails" }],
  },
  {
    id: "rating-factors",
    term: "Rating factors",
    aka: ["content, tasks, accuracy, text type", "four factors"],
    status: "interpretation",
    short:
      "Proficiency ratings in the STANAG/ILR family are commonly judged across four factors — the content handled, the tasks performed, the accuracy achieved, and the type of text produced — rather than as one impression.",
    body: `<p>Reading these separately is what lets a rater say <em>why</em> a performance sat where it did. SLP Command's Speaking evaluation reports exactly these four and names which one held the performance back.</p>
<p>The four-factor reading is standard testing practice, not a sentence quoted from the agreement. Treat it as a lens, not a rule.</p>`,
    see: [{ href: "/guides/speaking", label: "The four factors in speaking" }],
  },
  {
    id: "limiting-factor",
    term: "Limiting factor",
    aka: ["limiting criterion"],
    status: "interpretation",
    short:
      "The weakest of the rating factors in a single performance — the one that caps the level, however strong the others were.",
    body: `<p>Proficiency scales do not average. A response with Level 3 content and Level 2 accuracy is not "somewhere between": the weak factor decides. This is why a fluent speaker can be capped by precision, and a precise one capped by the range of tasks they attempt.</p>`,
    see: [{ href: "/guides/speaking", label: "Speaking" }],
  },
  {
    id: "task-achievement",
    term: "Task achievement",
    aka: ["on-task", "doing the task set"],
    status: "interpretation",
    short:
      "Whether a response actually did the job the prompt set — right audience, right purpose, required content — judged separately from how good the language was.",
    body: `<p>Separating task from language is the distinction that explains most surprising scores. A well-written text about the neighbouring topic has not performed the task it was given.</p>`,
    see: [{ href: "/guides/writing", label: "Task and language are two scores" }],
  },
  {
    id: "practice",
    term: "Practice",
    aka: ["practice session"],
    status: "product",
    short:
      "In SLP Command, a short untimed session in one skill at your target level, returning an explanation for each item rather than only a mark.",
    body: `<p>Practice exists to change what you do next. Because it is untimed, a practice result is weaker evidence about a real sitting than an exam simulation is.</p>`,
    see: [{ href: "/guides", label: "All guides" }],
  },
  {
    id: "exam-simulation",
    term: "Exam simulation",
    aka: ["mock", "simulacro"],
    status: "product",
    short:
      "In SLP Command, a full timed paper built to Level 2 or Level 3 formats, used to produce evidence under the conditions of a sitting.",
    body: `<p>Independent practice, not a national paper and not a certificate. A simulation will not be converted into a percentage chance of passing — that number would require calibration against official outcomes this product does not hold.</p>`,
    see: [{ href: "/exam", label: "What a simulation is for" }],
  },
];
