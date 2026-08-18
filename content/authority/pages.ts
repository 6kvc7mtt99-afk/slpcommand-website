export type AuthoritySection = { h2: string; html: string };
export type AuthorityFaq = { q: string; a: string };
export type AuthorityRelated = { href: string; label: string };
export type AuthoritySource = { label: string; url: string; note?: string };

export type AuthorityPageDef = {
  path: string;
  lang: "en" | "es";
  title: string;
  description: string;
  h1: string;
  kicker: string;
  updated: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  intent: string;
  funnel: "awareness" | "interest" | "consideration" | "conversion";
  hreflang?: { en?: string; es?: string };
  /**
   * Schema.org type for the page itself. `/guides` lists other pages rather
   * than carrying an argument of its own, and typing an index as an Article
   * misdescribes it. Defaults to Article.
   */
  schemaType?: "Article" | "CollectionPage";
  /**
   * Works the page actually relies on. Eleven of the twelve pages shipped with
   * no outbound citation at all, which is a poor footing for a site whose whole
   * argument is that it states the standard accurately. Rendered as a Sources
   * block and emitted as schema.org `citation`.
   */
  sources?: AuthoritySource[];
  related: AuthorityRelated[];
  faq: AuthorityFaq[];
  sections: AuthoritySection[];
  cta: { heading: string; body: string; href: string; label: string };
};

const UPDATED = "2026-08-18";

/**
 * Verified 18 August 2026 by fetching each URL. Do not add a source here that
 * has not been read: a citation to a page that does not say what we claim is
 * worse than no citation.
 */
const SRC_BILC: AuthoritySource = {
  label: "BILC — STANAG 6001 (Bureau for International Language Coordination)",
  url: "https://nato-bilc.org/stanag-6001/",
  note: "Describes Edition 5 as “the NATO agreed standard for language curriculum, test development, and for recording and reporting Standardized Language Profiles (SLPs)”.",
};

const SRC_JAPCC: AuthoritySource = {
  label:
    "Adubato, M. & Efthymiopoulos, M-P., “Capacity Language Building in NATO”, JAPCC Journal Ed. 19 (2014)",
  url: "https://www.japcc.org/articles/capacity-language-building-in-nato/",
  note: "“There is no official NATO test but merely national interpretations of the language levels outlined in STANAG 6001 and often one nation’s Level 2 is another nation’s Level 3.”",
};

const SRC_BILC_ES: AuthoritySource = {
  label: "BILC — STANAG 6001 (Bureau for International Language Coordination)",
  url: "https://nato-bilc.org/stanag-6001/",
  note: "Define la Edición 5 como el estándar acordado por la OTAN para currículo, desarrollo de pruebas y registro de los Perfiles Lingüísticos Estandarizados (SLP).",
};

const SRC_JAPCC_ES: AuthoritySource = {
  label:
    "Adubato, M. y Efthymiopoulos, M-P., «Capacity Language Building in NATO», JAPCC Journal Ed. 19 (2014)",
  url: "https://www.japcc.org/articles/capacity-language-building-in-nato/",
  note: "«No existe un examen oficial de la OTAN, sino interpretaciones nacionales de los niveles descritos en STANAG 6001.»",
};

const DISCLAIMER_EN =
  "<p class=\"note\"><strong>Independent resource.</strong> SLP Command is not affiliated with NATO, BILC, any Ministry of Defence, or any official examining body. National tests implement STANAG 6001 descriptors differently. Always confirm administration details with the authority that runs your sitting.</p>";

const DISCLAIMER_ES =
  "<p class=\"note\"><strong>Recurso independiente.</strong> SLP Command no está afiliado a la OTAN, a BILC, a ningún Ministerio de Defensa ni a ningún organismo examinador oficial. Las pruebas nacionales aplican los descriptores STANAG 6001 de forma distinta. Confirma siempre los detalles administrativos con la autoridad que convoca tu examen.</p>";

export const AUTHORITY_PAGES = {
  "stanag-6001": {
    path: "/stanag-6001",
    lang: "en",
    title: "What is STANAG 6001? NATO’s language standard",
    description:
      "STANAG 6001 is NATO’s language-proficiency standard, not a single official exam. How SLP profiles, levels 0–5, and national tests actually work.",
    h1: "STANAG 6001: the NATO language proficiency standard",
    kicker: "Reference",
    updated: UPDATED,
    primaryKeyword: "STANAG 6001",
    secondaryKeywords: ["NATO language proficiency", "BILC", "SLP", "STANAG 6001 exam"],
    intent: "informational",
    funnel: "awareness",
    sources: [SRC_BILC, SRC_JAPCC],
    related: [
      { href: "/slp", label: "What SLP means" },
      { href: "/slp-2", label: "SLP 2 (functional)" },
      { href: "/slp-3", label: "SLP 3 (professional)" },
      { href: "/exam", label: "Exam simulation" },
    ],
    faq: [
      {
        q: "Is there an official NATO English exam?",
        a: "No. STANAG 6001 is a proficiency standard. Nations design and administer their own tests against those descriptors. One nation’s Level 3 paper is not automatically another nation’s paper.",
      },
      {
        q: "Who maintains STANAG 6001?",
        a: "The Bureau for International Language Coordination (BILC) is the NATO body associated with the language-proficiency standard. Edition 5 is the current agreed edition referenced on BILC’s public pages.",
      },
      {
        q: "What does an SLP of 3333 mean?",
        a: "It is a Standardized Language Profile: Level 3 in Listening, Speaking, Reading and Writing, in that order. It is not an average of four scores.",
      },
      {
        q: "Is SLP Command an official STANAG assessment?",
        a: "No. It is an independent educational trainer. AI feedback is indicative guidance for preparation, not an official rating.",
      },
    ],
    sections: [
      {
        h2: "What STANAG 6001 is",
        html: `${DISCLAIMER_EN}
<p>STANAG 6001 (Standardization Agreement 6001) is the NATO-agreed standard for describing language proficiency. It is used to write curricula, develop tests, and <em>record and report</em> a person’s level across four skills.</p>
<p>The public owner of the standard’s language-testing community is the <a href="https://nato-bilc.org/stanag-6001/" rel="noopener noreferrer">Bureau for International Language Coordination (BILC)</a>. BILC describes Edition 5 as the agreed edition for proficiency levels.</p>
<p>That is a standard for <strong>what a level means</strong>. It is not a booklet you sit on a single NATO exam day.</p>`,
      },
      {
        h2: "What STANAG 6001 is not",
        html: `<ul>
<li>It is not one official NATO test paper used by every member nation.</li>
<li>It is not a CEFR certificate, even though people map the two.</li>
<li>It is not a vocabulary list of ranks and weapons.</li>
<li>It is not an average of your four skills.</li>
</ul>
<p>The Joint Air Power Competence Centre has stated publicly that there is no official NATO test — only national interpretations of the levels, and that one nation’s Level 2 is often not another’s. Treat every “downloadable STANAG test” without a named testing centre as unproven.</p>`,
      },
      {
        h2: "The six proficiency levels",
        html: `<p>Nations label the bands slightly differently. The working scale is 0 to 5:</p>
<div class="legal-table-wrap"><table class="legal-table">
<thead><tr><th>Level</th><th>Common English labels</th><th>What it asks of you, in plain terms</th></tr></thead>
<tbody>
<tr><td>0</td><td>No proficiency</td><td>No usable performance on the skill.</td></tr>
<tr><td>1</td><td>Survival / elementary</td><td>Basic needs, slow speech, high dependence on context.</td></tr>
<tr><td>2</td><td>Functional / limited working</td><td>Routine social and job language. Facts more than nuance.</td></tr>
<tr><td>3</td><td>Professional / minimum professional</td><td>Abstract topics, argument, implication, unexpected turns.</td></tr>
<tr><td>4</td><td>Expert</td><td>Precision across professional styles, including unfamiliar ground.</td></tr>
<tr><td>5</td><td>Highly articulate native</td><td>Rarely a training target for this product.</td></tr>
</tbody>
</table></div>
<p>SLP Command trains <strong>Level 2 and Level 3</strong> only. Those are the profiles that gate most postings and promotions.</p>`,
      },
      {
        h2: "How nations implement the standard",
        html: `<p>Spain administers an SLP sitting through defence channels. Italy uses the Joint Forces Language Test (JFLT). Poland runs a national STANAG 6001 English exam with its own speaking tasks. Hungary’s Ludovika Language Testing Centre publishes public practice for its accredited STANAG system. The United Kingdom’s Defence Academy offers STANAG assessments as a separate service.</p>
<p>The descriptors are shared. The paper in front of you is national. Preparation that pretends otherwise will surprise you on the day.</p>`,
      },
      {
        h2: "How to prepare without guessing",
        html: `<p>Useful preparation does three things the standard actually cares about:</p>
<ol>
<li>Trains each skill at the <em>target level</em>, not at a vague “harder” setting.</li>
<li>Separates task achievement from language quality — especially in writing and speaking.</li>
<li>Produces evidence under time, because an untimed 3 is not a timed 3.</li>
</ol>
<p>See <a href="/slp-2">SLP 2</a> and <a href="/slp-3">SLP 3</a> for the jump most candidates underestimate, and <a href="/guides/writing">writing</a> for the failure mode that looks like “good English”.</p>`,
      },
    ],
    cta: {
      heading: "Measure the profile. Then train it.",
      body: "SLP Command is an independent iOS trainer for SLP 2 and SLP 3 across all four skills. It will not invent a pass probability.",
      href: "/#pricing",
      label: "See how the trainer works",
    },
  },

  slp: {
    path: "/slp",
    lang: "en",
    title: "SLP meaning in STANAG 6001 (not speech therapy)",
    description:
      "In military language testing, SLP is a Standardized Language Profile: four digits for Listening, Speaking, Reading and Writing. It is not a therapy qualification.",
    h1: "SLP means Standardized Language Profile — not speech therapy",
    kicker: "Terminology",
    updated: UPDATED,
    primaryKeyword: "SLP STANAG",
    secondaryKeywords: ["Standardized Language Profile", "SLP 3333", "SLP 2222", "SLP exam"],
    intent: "informational",
    funnel: "awareness",
    sources: [SRC_BILC, SRC_JAPCC],
    related: [
      { href: "/stanag-6001", label: "STANAG 6001" },
      { href: "/slp-2", label: "SLP 2" },
      { href: "/slp-3", label: "SLP 3" },
      { href: "/es/examen-slp", label: "Examen SLP (España)" },
    ],
    faq: [
      {
        q: "Is SLP the same as speech-language pathology?",
        a: "No. Outside defence, SLP almost always means speech-language pathology. In STANAG 6001 it means Standardized Language Profile. Always pair the letters with STANAG, military, or the four-digit code.",
      },
      {
        q: "What order are the four digits?",
        a: "Listening, Speaking, Reading, Writing. An SLP of 3232 is Level 3 listening, Level 2 speaking, Level 3 reading, Level 2 writing.",
      },
      {
        q: "Can I average the four digits?",
        a: "No. STANAG levels are not averages. A 3 in reading does not lift a 2 in writing. The profile reports each skill separately because postings often require a minimum on a specific digit.",
      },
    ],
    sections: [
      {
        h2: "The four-digit code",
        html: `${DISCLAIMER_EN}
<p>A Standardized Language Profile is written as four digits, in a fixed order:</p>
<div class="legal-table-wrap"><table class="legal-table">
<thead><tr><th>Position</th><th>Skill</th><th>Example in 3332</th></tr></thead>
<tbody>
<tr><td>1</td><td>Listening</td><td>3</td></tr>
<tr><td>2</td><td>Speaking</td><td>3</td></tr>
<tr><td>3</td><td>Reading</td><td>3</td></tr>
<tr><td>4</td><td>Writing</td><td>2</td></tr>
</tbody>
</table></div>
<p>People say “I have a 3” when they mean 3333. That shorthand hides the digit that is actually blocking a posting. Read the profile, not the story you tell about it.</p>`,
      },
      {
        h2: "Why search results are confusing",
        html: `<p>On the open web, <strong>SLP</strong> is dominated by speech-language pathology. <strong>STANAG</strong> without the number 6001 is dominated by rifle magazines. If you search either word alone you will not find exam preparation.</p>
<p>Useful queries name the standard and the job: <em>STANAG 6001</em>, <em>SLP 3333</em>, <em>examen SLP militar</em>, <em>SLP 2222</em>.</p>`,
      },
      {
        h2: "SLP 2222 and SLP 3333",
        html: `<p><a href="/slp-2">SLP 2 / 2222</a> is the functional profile most forces treat as the working minimum for many international jobs. <a href="/slp-3">SLP 3 / 3333</a> is the professional profile: implication, hypothesis, argument, and unexpected questions.</p>
<p>The jump is not “more words”. It is a different kind of performance. Training a Level 2 memo until it is polished will not produce a Level 3 report.</p>`,
      },
    ],
    cta: {
      heading: "Train the digits, not an average",
      body: "SLP Command estimates each skill from rated attempts and will say when the evidence is thin or out of date.",
      href: "/#features",
      label: "See the method",
    },
  },

  "slp-2": {
    path: "/slp-2",
    lang: "en",
    title: "SLP 2 / SLP 2222 — functional level explained",
    description:
      "SLP 2 is the functional STANAG 6001 profile: routine job and social language across listening, speaking, reading and writing. What it requires, and what it does not.",
    h1: "SLP 2 (functional): what the profile actually requires",
    kicker: "Level 2",
    updated: UPDATED,
    primaryKeyword: "SLP 2",
    secondaryKeywords: ["SLP 2222", "STANAG 6001 level 2", "functional English military"],
    intent: "informational / commercial",
    funnel: "interest",
    hreflang: { en: "/slp-2", es: "/es/slp-2" },
    sources: [SRC_BILC, SRC_JAPCC],
    related: [
      { href: "/slp-3", label: "SLP 3" },
      { href: "/slp", label: "How to read an SLP" },
      { href: "/guides/writing", label: "Writing" },
      { href: "/es/slp-2", label: "SLP 2 en español" },
    ],
    faq: [
      {
        q: "Is SLP 2 the same as B1 or B2?",
        a: "People map it that way, and some Spanish guides write B1–B2. Mappings are approximate. A CEFR certificate is not a STANAG profile, and a profile is not a Cambridge paper.",
      },
      {
        q: "Is 2222 enough?",
        a: "For many roles, yes — it is the stated minimum. Some posts, courses and NATO jobs ask for a 3 on one or more digits. Read the requirement, not the rumour.",
      },
    ],
    sections: [
      {
        h2: "What “functional” means",
        html: `${DISCLAIMER_EN}
<p>Level 2 is limited working proficiency. You can handle routine social and job needs in a standard dialect, at normal speed, with some repetition. You get the facts. You do not reliably get the implication, the joke, or the carefully hedged disagreement.</p>
<p>That is not a small achievement. It is also not Level 3 with fewer adjectives.</p>`,
      },
      {
        h2: "Typical Level 2 performances",
        html: `<ul>
<li><strong>Listening</strong> — conversations about work routines, personal news, straightforward briefings. Comprehension drops in noise and on fast native-to-native talk.</li>
<li><strong>Speaking</strong> — describe, narrate in past/present/future, give simple instructions, handle everyday transactions. Complex structures are avoided or go wrong.</li>
<li><strong>Reading</strong> — authentic but simple texts on familiar topics; main ideas and relevant detail, with occasional misreads.</li>
<li><strong>Writing</strong> — usable emails, short reports, memos. Paragraphs exist. Cohesion is limited. The job still gets done.</li>
</ul>`,
      },
      {
        h2: "How people over-train the wrong thing",
        html: `<p>The usual waste at Level 2 is polishing the skill you already like — often reading — and avoiding timed listening and writing. A profile is four digits. The posting looks at the lowest one that matters.</p>
<p>A second waste is drilling word lists labelled “military English” while never writing a request that a busy officer could act on.</p>`,
      },
    ],
    cta: {
      heading: "Train SLP 2 as SLP 2",
      body: "The app builds Level 2 practice and mocks to Level 2 formats — not a single difficulty slider with the number moved.",
      href: "/#pricing",
      label: "See pricing",
    },
  },

  "slp-3": {
    path: "/slp-3",
    lang: "en",
    title: "SLP 3 / SLP 3333 — professional level explained",
    description:
      "SLP 3 is the professional STANAG 6001 profile. It asks for implication, argument, hypothesis and unexpected questions — not a longer Level 2 answer.",
    h1: "SLP 3 (professional): the jump most candidates underestimate",
    kicker: "Level 3",
    updated: UPDATED,
    primaryKeyword: "SLP 3",
    secondaryKeywords: ["SLP 3333", "STANAG 6001 level 3", "professional military English"],
    intent: "informational / commercial",
    funnel: "interest",
    hreflang: { en: "/slp-3", es: "/es/slp-3" },
    sources: [SRC_BILC, SRC_JAPCC],
    related: [
      { href: "/slp-2", label: "SLP 2" },
      { href: "/guides/writing", label: "Why writing fails" },
      { href: "/guides/listening", label: "Listening" },
      { href: "/es/slp-3", label: "SLP 3 en español" },
    ],
    faq: [
      {
        q: "Is SLP 3 the same as C1?",
        a: "Some guides map 3333 to B2–C1. That is a convenience, not a conversion table. Level 3 is defined by STANAG descriptors, not by Cambridge task types.",
      },
      {
        q: "How long does it take to go from 2 to 3?",
        a: "Unknown as a universal number. It depends on the lowest digit, how recently you have evidence, and whether you train the construct (argument, implication, task) or only vocabulary. Anyone selling a fixed number is guessing.",
      },
    ],
    sections: [
      {
        h2: "What “professional” means here",
        html: `${DISCLAIMER_EN}
<p>Level 3 is not fluency as a feeling. It is the ability to follow and produce language about practical, social and professional topics that may be unfamiliar; to handle meetings and presentations; to form hypotheses; to catch what is implied; to stay organised when the question was not the one you prepared.</p>
<p>Accent is rarely the thing that fails the profile. Organisation, task, and listening for stance are.</p>`,
      },
      {
        h2: "Where Level 2 habits break",
        html: `<ul>
<li><strong>Writing</strong> — a clean narrative about the wrong subject is still a fail. Level 3 wants a reasoned report, not a polished anecdote. See <a href="/guides/writing">task achievement</a>.</li>
<li><strong>Listening</strong> — gist of a familiar topic is not enough. You need the recommendation, the caveat, the number that changed the plan.</li>
<li><strong>Speaking</strong> — a memorised briefing dies in the follow-up. Level 3 includes the unexpected question.</li>
<li><strong>Reading</strong> — matching a word in the option to a word in the text is a Level 2 tactic. Level 3 items punish it.</li>
</ul>`,
      },
      {
        h2: "A Level 3 sentence does a job",
        html: `<p>Compare:</p>
<p><em>“The situation is very important and we must take action soon.”</em></p>
<p><em>“The delay appears to be logistical rather than political; if the convoy is not rerouted tonight, the resupply window closes.”</em></p>
<p>The second sentence takes a stance, names a cause, and states a consequence. That is the register. Adjectives were never the point.</p>`,
      },
    ],
    cta: {
      heading: "Train the constructs the rater can see",
      body: "SLP Command scores writing on task as well as language, and speaking on five named dimensions — with the reason attached.",
      href: "/guides/writing",
      label: "Start with writing",
    },
  },

  "es-examen-slp": {
    path: "/es/examen-slp",
    lang: "es",
    title: "Examen SLP de inglés: qué es y cómo prepararlo",
    description:
      "El SLP es el perfil lingüístico alineado con STANAG 6001. Qué significan 2222 y 3333, cómo se describe la convocatoria y cómo entrenar.",
    h1: "Examen SLP de inglés: qué es, cómo se convoca y cómo prepararlo",
    kicker: "España",
    updated: UPDATED,
    primaryKeyword: "examen SLP",
    secondaryKeywords: ["examen SLP inglés", "SLP 2222", "SLP 3333", "STANAG 6001", "SIPERDEF"],
    intent: "informational / commercial",
    funnel: "interest",
    sources: [SRC_BILC_ES, SRC_JAPCC_ES],
    related: [
      { href: "/es/slp-2", label: "SLP 2 / 2222" },
      { href: "/es/slp-3", label: "SLP 3 / 3333" },
      { href: "/stanag-6001", label: "STANAG 6001 (EN)" },
      { href: "/exam", label: "Simulacro" },
    ],
    faq: [
      {
        q: "¿Qué es el SLP?",
        a: "Standardized Language Profile: cuatro cifras (escucha, expresión oral, lectura, escritura) según STANAG 6001. En España es la prueba de perfil lingüístico de las Fuerzas Armadas / Guardia Civil.",
      },
      {
        q: "¿SLP Command convoca el examen?",
        a: "No. La inscripción es un trámite oficial (descrito públicamente a través de SIPERDEF / SOLIDI). Nosotros preparamos el idioma. No somos el Ministerio de Defensa.",
      },
      {
        q: "¿2222 o 3333?",
        a: "2222 es el perfil funcional que muchas funciones tratan como mínimo. 3333 es el profesional. Lee el requisito de tu destino o concurso, no el promedio de tus amigos.",
      },
    ],
    sections: [
      {
        h2: "Qué es el SLP en España",
        html: `${DISCLAIMER_ES}
<p>El SLP (Standardized Language Profile) es la forma de registrar la competencia lingüística según STANAG 6001. Evalúa cuatro destrezas, cada una del 0 al 5. Un perfil 2222 no es “un 2 de media”: es un 2 en cada destreza.</p>
<p>Guías públicas de academias describen la inscripción a través de <strong>SIPERDEF</strong>, módulo <strong>SOLIDI</strong>, con dos ventanas anuales (primavera y otoño) y requisitos de asistencia propios del organismo convocante. Eso es administración. Verifícalo siempre en el canal oficial — no en una web de preparación.</p>`,
      },
      {
        h2: "2222 y 3333",
        html: `<ul>
<li><a href="/es/slp-2">SLP 2 / 2222</a> — funcional: rutinas laborales y sociales, hechos más que matices.</li>
<li><a href="/es/slp-3">SLP 3 / 3333</a> — profesional: hipótesis, implicación, argumentación, imprevistos.</li>
</ul>
<p>El salto no es “más vocabulario militar”. Un informe de nivel 3 que no responde a la tarea falla aunque el inglés sea limpio.</p>`,
      },
      {
        h2: "Las cuatro pruebas, en la práctica",
        html: `<p>Las implementaciones nacionales varían el formato exacto. En descripciones públicas del SLP español suelen aparecer:</p>
<ul>
<li><strong>Listening</strong> — audio y respuestas objetivas. Suele ser la destreza que más gente describe como muro.</li>
<li><strong>Speaking</strong> — entrevista con evaluadores; a menudo grabada.</li>
<li><strong>Reading</strong> — textos y opción múltiple.</li>
<li><strong>Writing</strong> — redacción sobre un tema asignado.</li>
</ul>
<p>Entrena el <em>constructo</em> (tarea, tiempo, nivel), no un PDF sin procedencia.</p>`,
      },
      {
        h2: "Cómo preparar sin academia de 120&nbsp;€/mes",
        html: `<p>Las academias presenciales y online en España cobran, de forma verificable en 2026, entre decenas y más de cien euros al mes, o paquetes cercanos a 200&nbsp;€. Un entrenador diario no sustituye a un examinador humano de speaking. Sí puede medir reading, listening, writing y speaking todos los días que la academia no está.</p>
<p>Empieza por el dígito más bajo. Mide en condiciones de tiempo. No conviertas “entiendo películas” en un 3 de listening.</p>`,
      },
    ],
    cta: {
      heading: "Entrena el perfil, no el rumor",
      body: "SLP Command es una plataforma independiente para SLP 2 y SLP 3. No es una prueba oficial.",
      href: "/#pricing",
      label: "Ver el producto",
    },
  },

  "es-slp-2": {
    path: "/es/slp-2",
    lang: "es",
    title: "SLP 2 / SLP 2222 — nivel funcional",
    description:
      "Qué exige el perfil SLP 2 (2222) según STANAG 6001: inglés funcional para el trabajo rutinario, no un B2 de academia genérica.",
    h1: "SLP 2 (funcional): lo que el perfil pide de verdad",
    kicker: "Nivel 2",
    updated: UPDATED,
    primaryKeyword: "SLP 2222",
    secondaryKeywords: ["SLP 2", "nivel funcional STANAG", "preparar SLP 2"],
    intent: "informational / commercial",
    funnel: "interest",
    hreflang: { en: "/slp-2", es: "/es/slp-2" },
    sources: [SRC_BILC_ES],
    related: [
      { href: "/es/slp-3", label: "SLP 3" },
      { href: "/es/examen-slp", label: "Examen SLP" },
      { href: "/slp-2", label: "English version" },
    ],
    faq: [
      {
        q: "¿2222 equivale a B1 o B2?",
        a: "Algunas guías lo sitúan entre B1 y B2. Es una equivalencia aproximada, no una convalidación automática.",
      },
    ],
    sections: [
      {
        h2: "Qué significa «funcional»",
        html: `${DISCLAIMER_ES}
<p>El nivel 2 es <strong>competencia funcional limitada</strong>. Te permite resolver necesidades sociales y laborales rutinarias en un registro estándar, a velocidad normal, admitiendo alguna repetición. Captas los hechos. No captas de forma fiable la implicación, la ironía ni el desacuerdo formulado con cautela.</p>
<p>No es poca cosa: es el nivel que muchos destinos exigen. Pero no es «un 3 con menos vocabulario». Son constructos distintos, y se entrenan distinto.</p>`,
      },
      {
        h2: "Cómo se comporta un 2 en cada destreza",
        html: `<ul>
<li><strong>Listening</strong> — conversaciones sobre rutinas de trabajo, novedades personales, instrucciones directas. El rendimiento cae con ruido de fondo y con hablantes nativos entre sí.</li>
<li><strong>Speaking</strong> — describir, narrar en pasado, presente y futuro, dar instrucciones sencillas, resolver gestiones cotidianas. Las estructuras complejas se evitan o se rompen.</li>
<li><strong>Reading</strong> — textos auténticos pero sencillos sobre temas conocidos: idea principal y detalle relevante, con vacilación ante la sintaxis larga.</li>
<li><strong>Writing</strong> — correo, nota de servicio, informe breve. La gramática puede ser correcta y el texto seguir sin cumplir la tarea que se pedía.</li>
</ul>
<p>El perfil se lee por dígitos, en el orden <strong>Listening–Speaking–Reading–Writing</strong>. Un 2222 no es una media: son cuatro calificaciones independientes.</p>`,
      },
      {
        h2: "El error habitual: entrenar lo que ya se te da bien",
        html: `<p>El desperdicio típico en nivel 2 es pulir la destreza cómoda —casi siempre reading— y esquivar el listening cronometrado y el writing con tarea. El destino no mira tu mejor dígito: mira el que te falta.</p>
<p>El segundo desperdicio es memorizar listas de «inglés militar» sin haber escrito nunca una petición que un superior ocupado pueda ejecutar sin volver a preguntar. El vocabulario técnico no compensa una tarea incumplida.</p>`,
      },
      {
        h2: "Qué entrenar primero",
        html: `<p>Si tu objetivo es consolidar un 2 en los cuatro dígitos, el orden que suele rendir más es:</p>
<ol>
<li><strong>Listening cronometrado</strong>, con audio a velocidad real y una sola escucha cuando el formato lo permita.</li>
<li><strong>Writing de tarea corta</strong>: correo, nota, informe breve — evaluando primero si la tarea se cumplió y después la lengua.</li>
<li><strong>Speaking</strong> con preguntas de seguimiento, no con exposición memorizada.</li>
<li><strong>Reading</strong>, que suele ser el dígito que menos trabajo adicional necesita a este nivel.</li>
</ol>
<p>Si ya narras en pasado con soltura, otro temario general de gramática no es tu cuello de botella.</p>`,
      },
    ],
    cta: {
      heading: "Entrena SLP 2 como SLP 2",
      body: "Formatos de nivel 2, no un cursor de dificultad con otro número.",
      href: "/#pricing",
      label: "Ver precios",
    },
  },

  "es-slp-3": {
    path: "/es/slp-3",
    lang: "es",
    title: "SLP 3 / SLP 3333 — nivel profesional",
    description:
      "SLP 3 pide argumentación, implicación e imprevistos. No es un SLP 2 más largo. Cómo cambia writing, listening, reading y speaking.",
    h1: "SLP 3 (profesional): el salto que más se subestima",
    kicker: "Nivel 3",
    updated: UPDATED,
    primaryKeyword: "SLP 3333",
    secondaryKeywords: ["SLP 3", "preparar SLP 3", "nivel profesional STANAG"],
    intent: "informational / commercial",
    funnel: "interest",
    hreflang: { en: "/slp-3", es: "/es/slp-3" },
    sources: [SRC_BILC_ES],
    related: [
      { href: "/es/slp-2", label: "SLP 2" },
      { href: "/guides/writing", label: "Writing (EN)" },
      { href: "/es/examen-slp", label: "Examen SLP" },
    ],
    faq: [
      {
        q: "¿Cuánto tardo de 2 a 3?",
        a: "No hay un número honesto que valga para todos. Depende del dígito más bajo y de si entrenas el constructo o solo vocabulario.",
      },
    ],
    sections: [
      {
        h2: "Qué pide el 3",
        html: `${DISCLAIMER_ES}
<p>El nivel 3 no es «fluidez» entendida como sensación. Es la capacidad de seguir y producir lengua sobre temas prácticos, sociales y profesionales <strong>que pueden no serte familiares</strong>: reuniones, exposiciones, hipótesis, lo implícito, y la pregunta que no habías preparado.</p>
<p>El acento rara vez es lo que tumba el perfil. Lo que lo tumba es la organización, la tarea y la precisión bajo presión.</p>`,
      },
      {
        h2: "Dónde se rompen los hábitos de nivel 2",
        html: `<ul>
<li><strong>Writing</strong> — un texto limpio sobre el asunto equivocado sigue siendo un suspenso. El 3 pide un informe razonado, no una anécdota bien redactada. Ver <a href="/guides/writing">por qué falla el writing</a>.</li>
<li><strong>Listening</strong> — captar la idea general de un tema conocido ya no basta. Hace falta la recomendación, la salvedad y el número que cambió el plan.</li>
<li><strong>Speaking</strong> — una exposición memorizada se cae en el turno de preguntas. El 3 incluye lo imprevisto.</li>
<li><strong>Reading</strong> — elegir la opción que repite una palabra del texto es la trampa clásica; el 3 se juega en la inferencia.</li>
</ul>`,
      },
      {
        h2: "Una frase de nivel 3 hace un trabajo",
        html: `<p>Compara:</p>
<blockquote><p>«La situación es muy importante y debemos actuar pronto.»</p></blockquote>
<blockquote><p>«El retraso parece logístico más que político; si el convoy no se desvía esta noche, se cierra la ventana de reabastecimiento.»</p></blockquote>
<p>La segunda toma una posición, nombra una causa y enuncia una consecuencia. Ese es el registro. Los adjetivos nunca fueron el problema.</p>`,
      },
      {
        h2: "Cómo prepararlo sin engañarte",
        html: `<p>El salto del 2 al 3 se subestima porque el 2 se alcanza acumulando; el 3 se alcanza <em>reorganizando</em>. Tres comprobaciones honestas:</p>
<ul>
<li>¿Puedes defender una postura ante una pregunta que no ensayaste?</li>
<li>¿Tu writing responde a la tarea pedida, o al tema que dominas?</li>
<li>¿Sostienes el rendimiento con reloj, o sólo sin límite de tiempo?</li>
</ul>
<p>Si alguna respuesta es «no», el trabajo no es más vocabulario. Es entrenar el constructo que falla, medido. Consulta también <a href="/es/examen-slp">cómo se convoca y se prepara el examen SLP</a>.</p>`,
      },
    ],
    cta: {
      heading: "Mide el 3 antes de sentarte",
      body: "Simulacros cronometrados y evaluación con el razonamiento a la vista.",
      href: "/exam",
      label: "Cómo es un simulacro",
    },
  },

  guides: {
    path: "/guides",
    lang: "en",
    schemaType: "CollectionPage" as const,
    title: "STANAG 6001 / SLP guides",
    description:
      "Independent guides to STANAG 6001 and SLP preparation: levels, writing, listening, and exam simulation. Not an official NATO resource.",
    h1: "Guides to STANAG 6001 and SLP preparation",
    kicker: "Learn",
    updated: UPDATED,
    primaryKeyword: "STANAG 6001 preparation",
    secondaryKeywords: ["SLP preparation", "military English guides"],
    intent: "informational",
    funnel: "awareness",
    sources: [SRC_BILC],
    related: [
      { href: "/stanag-6001", label: "STANAG 6001" },
      { href: "/slp", label: "SLP" },
      { href: "/about", label: "About SLP Command" },
    ],
    faq: [],
    sections: [
      {
        h2: "Start here",
        html: `${DISCLAIMER_EN}
<p>These pages exist so a candidate — or a language model citing the open web — can find a clean, sourced explanation of the standard and the product. They are not official descriptors and they are not a leaked paper.</p>
<ul>
<li><a href="/stanag-6001">What STANAG 6001 is</a> — and is not.</li>
<li><a href="/slp">How to read an SLP</a>, including why it is not speech therapy.</li>
<li><a href="/slp-2">SLP 2</a> and <a href="/slp-3">SLP 3</a>.</li>
<li><a href="/guides/writing">Writing: good English, wrong task</a>.</li>
<li><a href="/guides/listening">Listening: where sittings are lost</a>.</li>
<li><a href="/exam">What an exam simulation is for</a>.</li>
<li><a href="/es/examen-slp">Examen SLP en España</a>.</li>
</ul>
<p>Product training for Reading, Listening, Writing and Speaking lives in the iOS app — those URLs are the trainer, not these guides.</p>`,
      },
    ],
    cta: {
      heading: "A plan, not a menu",
      body: "When you open the app, the first screen is today’s session: what to train, what to skip, and why.",
      href: "/#features",
      label: "See the platform",
    },
  },

  "guides-writing": {
    path: "/guides/writing",
    lang: "en",
    title: "STANAG / SLP writing: why good English still fails",
    description:
      "SLP and STANAG writing is failed on the task more often than on grammar. How Level 2 memos differ from Level 3 reports, and what raters actually mark.",
    h1: "SLP / STANAG writing fails on the task more often than on the grammar",
    kicker: "Writing",
    updated: UPDATED,
    primaryKeyword: "STANAG 6001 writing level 3",
    secondaryKeywords: ["SLP writing", "SLP 3 writing", "task achievement STANAG"],
    intent: "informational / commercial",
    funnel: "consideration",
    sources: [SRC_BILC],
    related: [
      { href: "/slp-3", label: "SLP 3" },
      { href: "/guides/listening", label: "Listening" },
      { href: "/exam", label: "Exam simulation" },
    ],
    faq: [
      {
        q: "My writing was good English but scored low. Why?",
        a: "Almost always the response did not do the task that was set. Raters separate language quality from whether you answered the brief. So does SLP Command.",
      },
      {
        q: "Should I memorise a Cambridge essay template?",
        a: "No. STANAG writing at Level 2 is a usable workplace text. At Level 3 it is a reasoned professional text. “In today’s world” is a stall, not an introduction.",
      },
    ],
    sections: [
      {
        h2: "Two scores, not one",
        html: `${DISCLAIMER_EN}
<p>A rater is not asking “is this nice English?”. They are asking two questions that can come apart:</p>
<ol>
<li>Did this text do the job the prompt set — audience, purpose, required content?</li>
<li>Was the language accurate, organised, and precise enough for the level?</li>
</ol>
<p>A fluent, well-organised piece about the neighbouring topic is not a Level 3 performance of the task you were given. Treating it as one is the single most misleading thing a trainer can do before a sitting.</p>`,
      },
      {
        h2: "Level 2 vs Level 3 on the page",
        html: `<div class="legal-table-wrap"><table class="legal-table">
<thead><tr><th></th><th>Level 2</th><th>Level 3</th></tr></thead>
<tbody>
<tr><td>Typical job</td><td>Email, short memo, straightforward report</td><td>Reasoned report, position, recommendation with caveats</td></tr>
<tr><td>Organisation</td><td>Simple paragraphs, limited cohesion</td><td>Clear development, transitions that earn their keep</td></tr>
<tr><td>Stance</td><td>Facts and requests</td><td>Hypothesis, hedging, consequence</td></tr>
<tr><td>Failure mode</td><td>Missing the request; fragments</td><td>Beautiful English on the wrong brief</td></tr>
</tbody>
</table></div>`,
      },
      {
        h2: "A worked contrast",
        html: `<p><strong>Prompt (illustrative, not from a live official paper):</strong> Recommend whether a planned night move should proceed, given a delayed fuel convoy.</p>
<p><strong>Off-task, however clean:</strong> a general essay on the importance of logistics in modern operations.</p>
<p><strong>On-task:</strong> a recommendation, the constraint (fuel), a caveat (if the convoy arrives before 02:00…), and a next step (who is told, by when).</p>
<p>The second text can be shorter and still be the higher performance.</p>`,
      },
    ],
    cta: {
      heading: "See the reason, not just a band",
      body: "Writing evaluation in SLP Command returns the improved version beside yours and says when the language was not the problem.",
      href: "/#pricing",
      label: "See the trainer",
    },
  },

  "guides-listening": {
    path: "/guides/listening",
    lang: "en",
    title: "STANAG / SLP listening: why it feels too fast",
    description:
      "SLP listening is lost on connected speech, numbers, stance and noise — not on rare vocabulary. How to train the skill the sitting actually rates.",
    h1: "SLP listening is not a vocabulary test",
    kicker: "Listening",
    updated: UPDATED,
    primaryKeyword: "STANAG 6001 listening",
    secondaryKeywords: ["SLP listening", "military English listening", "connected speech STANAG"],
    intent: "informational / commercial",
    funnel: "consideration",
    sources: [SRC_BILC],
    related: [
      { href: "/slp-3", label: "SLP 3" },
      { href: "/guides/writing", label: "Writing" },
      { href: "/exam", label: "Exam simulation" },
    ],
    faq: [
      {
        q: "I understand films. Why do I fail exam listening?",
        a: "Films are entertainment listening with pictures. Exam listening is a briefing, an interview, or a conversation in which the recommendation is not the first sentence. Different skill.",
      },
      {
        q: "Should I study more military acronyms?",
        a: "Only after you can recover numbers, polarity (will / will not), and the speaker’s stance. Acronyms are not the usual failure.",
      },
    ],
    sections: [
      {
        h2: "Where the marks actually go",
        html: `${DISCLAIMER_EN}
<p>Candidates describe listening as “too fast”. Speed is the symptom. The cause is usually one of four:</p>
<ul>
<li>Weak forms and connected speech — <em>to / can / are</em> disappear.</li>
<li>A number, time, or grid that carried the meaning.</li>
<li>Stance: the recommendation, not the topic.</li>
<li>Noise, radio, or an accent you never trained.</li>
</ul>
<p>Spanish academies openly call listening the hardest paper. That matches what teachers publish on YouTube. It is not fixed by another word list.</p>`,
      },
      {
        h2: "How to practise this week",
        html: `<ol>
<li>One short authentic briefing or interview. No transcript first.</li>
<li>Write the speaker’s <em>recommendation</em> in one sentence.</li>
<li>Replay only for the number or polarity you missed.</li>
<li>Then read a transcript, if you have one, to name the weak form — not to memorise the text.</li>
</ol>
<p>Do this under a clock. Untimed listening is a different skill from the sitting.</p>`,
      },
    ],
    cta: {
      heading: "Train the recording you will actually meet",
      body: "Listening practice and mocks in SLP Command are built to the level you chose. The estimate says when the evidence is thin.",
      href: "/#pricing",
      label: "See the trainer",
    },
  },

  exam: {
    path: "/exam",
    lang: "en",
    title: "STANAG / SLP exam simulation",
    description:
      "What a timed SLP 2 or SLP 3 mock is for — and what it is not. Why untimed practice overstates a profile.",
    h1: "Sit it before the board does",
    kicker: "Exam simulation",
    updated: UPDATED,
    primaryKeyword: "STANAG mock exam",
    secondaryKeywords: ["simulacro SLP", "SLP exam practice", "timed STANAG test"],
    intent: "commercial",
    funnel: "consideration",
    sources: [SRC_BILC],
    related: [
      { href: "/guides/writing", label: "Writing" },
      { href: "/guides/listening", label: "Listening" },
      { href: "/slp-3", label: "SLP 3" },
    ],
    faq: [
      {
        q: "Is this the official exam?",
        a: "No. SLP Command simulations are independent practice built to Level 2 and Level 3 formats. They are not a national paper and not a NATO certificate.",
      },
      {
        q: "Why time it?",
        a: "Because evidence produced under the conditions of the sitting is worth more than a leisurely practice score. A 3 with a dictionary and a pause button is not a 3 on the day.",
      },
    ],
    sections: [
      {
        h2: "What a mock is for",
        html: `${DISCLAIMER_EN}
<p>A simulation exists to change your plan. If it only produces a number you like, it failed. After a timed paper you should know which construct moved, which digit is still thin, and what tomorrow’s session should refuse to train.</p>`,
      },
      {
        h2: "What we will not display",
        html: `<p>SLP Command will not convert your mock into a percentage chance of passing a real sitting. That figure would require calibration against official outcomes we do not have. People book exams on that number. We do not invent it.</p>`,
      },
    ],
    cta: {
      heading: "One full exam on the free plan",
      body: "Professional removes the monthly cap so you can repeat the sitting until the evidence is stable.",
      href: "/#pricing",
      label: "Free and Professional",
    },
  },

  about: {
    path: "/about",
    lang: "en",
    title: "About SLP Command",
    description:
      "SLP Command is an independent educational platform for STANAG 6001 / SLP-style exam preparation at Levels 2 and 3. What it is, what it is not, and how to name it.",
    h1: "About SLP Command",
    kicker: "Entity",
    updated: UPDATED,
    primaryKeyword: "SLP Command",
    secondaryKeywords: ["SLP Command app", "military English trainer"],
    intent: "informational / branded",
    funnel: "awareness",
    sources: [SRC_BILC],
    related: [
      { href: "/stanag-6001", label: "STANAG 6001" },
      { href: "/disclaimer", label: "Institutional disclaimer" },
      { href: "/trust-center", label: "Trust Center" },
      { href: "/#pricing", label: "Pricing" },
    ],
    faq: [
      {
        q: "Is SLP Command affiliated with NATO?",
        a: "No. It is an independent educational platform. It is not affiliated with NATO, any Ministry of Defence, or any official examining body.",
      },
      {
        q: "What does the product cover?",
        a: "Reading, Listening, Writing and Speaking at SLP Level 2 and Level 3, on iOS, with practice, exam simulation, Academy and Intelligence.",
      },
    ],
    sections: [
      {
        h2: "Canonical description",
        html: `${DISCLAIMER_EN}
<p><strong>SLP Command</strong> is an independent educational platform for STANAG 6001 / SLP-style English exam preparation at Levels 2 and 3. It trains Reading, Listening, Writing and Speaking. AI-generated feedback is indicative guidance, not an official SLP / STANAG 6001 assessment.</p>
<p>Use that paragraph everywhere: App Store, biographies, press, and citations. Do not shorten it to “the NATO app”.</p>`,
      },
      {
        h2: "What it is not",
        html: `<ul>
<li>Not an official examining body.</li>
<li>Not a speech-language pathology product.</li>
<li>Not a vocabulary toy and not a general CEFR course.</li>
<li>Not a pass-probability engine.</li>
<li>Not available on Android at the time of this page.</li>
</ul>`,
      },
      {
        h2: "Method, in one sentence",
        html: `<p>Nothing is asserted about your English without measurement, and every recommendation names the evidence that produced it. The public brand line is: <em>Stop guessing. Start measuring.</em></p>
<p>Legal identity, privacy, and AI use are documented on the <a href="/trust-center">Trust Center</a>.</p>`,
      },
    ],
    cta: {
      heading: "Read the product, then the disclaimer",
      body: "Features and pricing are on the homepage. The institutional disclaimer is binding copy, not footer decoration.",
      href: "/disclaimer",
      label: "Institutional disclaimer",
    },
  },
} satisfies Record<string, AuthorityPageDef>;
