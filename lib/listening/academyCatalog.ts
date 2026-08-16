export type ListeningAcademyCategory = "slp2" | "slp3" | "literalExtraction" | "examStrategies";

export type ListeningAcademyTopic = {
  id: string;
  title: string;
  description: string;
  whyItMatters: string;
  commonMistakes: string[];
  examTips: string[];
  category: ListeningAcademyCategory;
  level: 2 | 3 | null;
  targetSkill: string | null;
  targetSubSkill: string | null;
  lessons: Array<{ id: string; title: string; learningObjective: string }>;
};

const slp2Topics: ListeningAcademyTopic[] = [
  topic("factual_detail", "Specific Details", "Catching explicit facts, quantities, codes and names stated directly.", "SLP2 questions reward you for hearing the exact value, not the gist.", ["Remembering the topic but not the exact number or code.", "Confusing similar values (channel 7 vs channel 9)."], ["Note numbers and codes the instant you hear them.", "Expect distractors that are 'close but wrong' values."], "slp2", 2, "factual_detail", null),
  topic("concrete_instruction", "Instructions", "Following a concrete instruction and its exact parameter (time, place, quantity).", "Orders in the field carry one correct parameter — you must catch it precisely.", ["Hearing the action but missing the 'by 1400' or 'to bay C-3'.", "Assuming the default instead of the stated parameter."], ["Listen for the verb + its parameter as a pair.", "The parameter is the answer — anchor on it."], "slp2", 2, "concrete_instruction", null),
  topic("simple_change", "Changes & Updates", "Detecting what changed from a previous state to the current one.", "Briefings constantly update prior information; the change is the point.", ["Picking the old value instead of the new one.", "Missing the 'now / instead of / no longer' signal."], ["Listen for contrast words: now, instead, changed, no longer.", "Track before → after as a pair."], "slp2", 2, "simple_change", null),
  topic("speaker_action", "Speaker Intent", "Identifying what a named speaker does or will do.", "You must attribute the right action to the right person.", ["Attributing an action to the wrong named person.", "Confusing who acts vs who is mentioned."], ["Map each name to its action as you listen.", "Watch for two names with different tasks."], "slp2", 2, "speaker_action", null),
];

const slp3Topics: ListeningAcademyTopic[] = [
  topic("inference", "Inference & Hidden Meaning", "Drawing conclusions that are implied but never stated outright.", "SLP3 tests understanding of what the speaker means, not just says.", ["Choosing the literal restatement instead of the implied point.", "Over-inferring beyond what the audio supports."], ["Ask 'what does this suggest?' not 'what was said?'.", "Your inference must be traceable to a cue in the audio."], "slp3", 3, "inference", null),
  topic("implication", "Implications & Consequences", "Understanding what a statement suggests beyond its literal meaning.", "Operational messages often imply an action or outcome without naming it.", ["Stopping at the surface meaning.", "Missing the practical consequence implied."], ["Ask 'so what follows from this?'.", "Link the statement to its likely effect."], "slp3", 3, "implication", null),
  topic("reasoning", "Logical Reasoning", "Following the logical chain behind a speaker's argument.", "You must track why a conclusion follows, not just that it does.", ["Losing the connection between premise and conclusion.", "Accepting a plausible-but-unsupported option."], ["Trace because / therefore / so links.", "Reject options the reasoning doesn't support."], "slp3", 3, "reasoning", null),
  topic("attitude", "Speaker Attitude & Tone", "Recognising a speaker's stance, tone or emotional attitude.", "Tone changes meaning — approval, doubt or urgency shift the answer.", ["Ignoring tone and judging only words.", "Confusing neutral reporting with opinion."], ["Notice emphasis, hesitation and word choice.", "Ask 'how does the speaker feel about this?'."], "slp3", 3, "attitude", null),
  topic("synthesis", "Synthesis", "Combining several pieces of information into one coherent whole.", "The answer may depend on joining two separate statements.", ["Answering from one detail and ignoring another.", "Missing that two parts must be combined."], ["Hold multiple facts and merge them.", "The correct option often integrates two cues."], "slp3", 3, "synthesis", null),
  topic("conclusion", "Conclusions", "Drawing a valid logical conclusion from the audio.", "You must reach the endpoint the evidence points to.", ["Choosing a conclusion the audio doesn't justify.", "Stopping short of the full conclusion."], ["Ask 'what is the takeaway?'.", "Only accept conclusions the evidence forces."], "slp3", 3, "conclusion", null),
  topic("purpose", "Purpose", "Identifying the underlying purpose of a message.", "Knowing why something is said clarifies the intended answer.", ["Confusing the topic with the purpose.", "Missing a persuasive or warning intent."], ["Ask 'why is the speaker saying this?'.", "Purpose is often broader than the details."], "slp3", 3, "purpose", null),
  topic("consequence", "Consequences", "Understanding the likely consequence of an event or decision.", "Operational audio frequently signals cause and effect.", ["Identifying the cause but not its result.", "Choosing an unrelated outcome."], ["Follow cause → effect chains.", "Pick the outcome the audio implies."], "slp3", 3, "consequence", null),
  topic("contrast", "Contrast", "Identifying contrasts or contradictions between ideas.", "Contrast markers often carry the key distinction being tested.", ["Missing the 'but / however / whereas' pivot.", "Blending two contrasted ideas into one."], ["Flag contrast markers when you hear them.", "Keep the two contrasted sides separate."], "slp3", 3, "contrast", null),
  topic("prediction", "Prediction", "Predicting a likely outcome based on the audio.", "Some questions ask what happens next given the situation.", ["Predicting beyond the given evidence.", "Ignoring signals that constrain the outcome."], ["Base predictions on stated conditions.", "Choose the most supported next step."], "slp3", 3, "prediction", null),
  topic("fact_vs_opinion", "Fact vs Opinion", "Distinguishing stated facts from speaker opinions.", "Mixing fact and opinion leads to the wrong answer at SLP3.", ["Treating an opinion as a confirmed fact.", "Missing opinion signals like 'I think / probably'."], ["Separate 'what is' from 'what the speaker believes'.", "Opinion markers change the correct option."], "slp3", 3, "fact_vs_opinion", null),
];

const literalTopics: ListeningAcademyTopic[] = [
  topic("sub_numbers", "Numbers", "Catching the exact figure stated — a count, code or measurement.", "A close-but-wrong number is still wrong; only the exact value counts.", ["Rounding or approximating instead of the exact figure.", "Confusing a similar-sounding number."], ["Lock onto digits the instant you hear them.", "Write the number down as a placeholder while listening on."], "literalExtraction", 2, null, "numbers", [
    ["numbers_understanding", "Understanding Numbers", "Catch and retain a spoken number correctly on first hearing, without rounding or guessing."],
    ["numbers_measurements", "Measurements", "Correctly capture a number together with its unit of measurement, not just the digit."],
    ["numbers_coordinates", "Coordinates", "Accurately follow a sequence of numbers and letters used to specify a map location."],
    ["numbers_radiocalls", "Radio Calls", "Recognise and correctly interpret numbers spoken using radio/phonetic conventions."],
  ]),
  topic("sub_times", "Times & Timings", "Catching the exact clock time or time-of-day the answer hinges on.", "Operational timing is precise — 'around' is not the same as the stated time.", ["Mishearing AM/PM or 12h vs 24h format.", "Confusing the stated time with a nearby one mentioned."], ["Anchor on hour + minute as a single unit.", "Watch for time changes announced mid-message."], "literalExtraction", 2, null, "times"),
  topic("sub_locations", "Locations", "Catching the exact place, gate, checkpoint or route point stated.", "The wrong location is a wrong answer even if everything else is understood.", ["Confusing a similarly-named location.", "Missing a location update mid-message."], ["Track named places as they're introduced.", "Note any 'moved to / now at' correction."], "literalExtraction", 2, null, "locations"),
  topic("sub_frequencies", "Radio Frequencies", "Catching the exact radio channel or frequency referenced.", "Using the wrong channel breaks communication entirely — precision is the whole point.", ["Confusing a similar channel number.", "Missing a stated frequency change."], ["Note the channel the moment it's given.", "Watch for 'switch to / now on' cues."], "literalExtraction", 2, null, "frequencies"),
  topic("sub_quantities", "Quantities", "Catching an exact amount with its unit — length, weight, headcount or similar.", "Logistics and reporting depend on the precise quantity, not an estimate.", ["Dropping the unit and keeping only the number.", "Confusing 'how many' with 'how much'."], ["Pair the number with its unit as one chunk.", "Listen for quantity changes (increase/decrease)."], "literalExtraction", 2, null, "quantities"),
  topic("sub_dates", "Dates & Days", "Catching the exact calendar date or day referenced.", "Planning and operations hinge on the correct date, not an approximate one.", ["Confusing the day of the week with the date.", "Missing a rescheduled date."], ["Anchor on day + date as a pair.", "Watch for 'moved to / rescheduled to' signals."], "literalExtraction", 2, null, "dates"),
];

const strategyTopics: ListeningAcademyTopic[] = [
  topic("strategy_active_listening", "How to Listen Actively", "Stay engaged and anticipate content instead of listening passively.", "Active listeners catch key data on the first (and only) play.", ["Waiting passively for the answer.", "Losing focus mid-audio."], ["Predict from the question before the audio.", "Listen for the specific data the question targets."], "examStrategies", null, null, null),
  topic("strategy_time_management", "Time Management", "Allocate attention across questions without falling behind.", "One lost question shouldn't cost you the next one.", ["Dwelling on a missed answer.", "Not previewing the next question."], ["Move on immediately if you miss one.", "Preview the next question while audio loads."], "examStrategies", null, null, null),
  topic("strategy_distractors", "Beating Distractors", "Recognise options designed to trap partial listeners.", "Distractors sound right but contradict a detail in the audio.", ["Choosing the option that 'sounds' familiar.", "Ignoring a single disqualifying word."], ["Reject options that change one key value.", "Confirm every option against the audio."], "examStrategies", null, null, null),
  topic("strategy_prediction", "Prediction Techniques", "Use the question and context to anticipate what you'll hear.", "Anticipation frees attention for the exact answer.", ["Going in with no expectation.", "Ignoring context cues."], ["Turn the question into a listening goal.", "Predict the answer type (number, place, person)."], "examStrategies", null, null, null),
];

function topic(
  id: string,
  title: string,
  description: string,
  whyItMatters: string,
  commonMistakes: string[],
  examTips: string[],
  category: ListeningAcademyCategory,
  level: 2 | 3 | null,
  targetSkill: string | null,
  targetSubSkill: string | null,
  lessons: Array<[string, string, string]> = [],
): ListeningAcademyTopic {
  return {
    id,
    title,
    description,
    whyItMatters,
    commonMistakes,
    examTips,
    category,
    level,
    targetSkill,
    targetSubSkill,
    lessons: lessons.map(([lessonId, lessonTitle, learningObjective]) => ({ id: lessonId, title: lessonTitle, learningObjective })),
  };
}

export const LISTENING_ACADEMY_CATEGORIES: Array<{ key: ListeningAcademyCategory; label: string }> = [
  { key: "slp2", label: "SLP 2 Core Skills" },
  { key: "slp3", label: "SLP 3 Core Skills" },
  { key: "literalExtraction", label: "Literal Extraction Skills" },
  { key: "examStrategies", label: "Exam Strategies" },
];

export const listeningAcademyTopics: ListeningAcademyTopic[] = [
  ...slp2Topics,
  ...slp3Topics,
  ...literalTopics,
  ...strategyTopics,
];

export function topicsFor(category: ListeningAcademyCategory): ListeningAcademyTopic[] {
  return listeningAcademyTopics.filter((item) => item.category === category);
}

export function freeTopicIds(topics = listeningAcademyTopics): string[] {
  const byCategory = (category: ListeningAcademyCategory) => topics.filter((item) => item.category === category);
  return [
    ...byCategory("slp2").slice(0, 1),
    ...byCategory("slp3").slice(0, 2),
    ...byCategory("literalExtraction").slice(0, 1),
    ...byCategory("examStrategies").slice(0, 1),
  ].map((item) => item.id);
}

export function isListeningTopicLocked(topicId: string, isPro: boolean, topics = listeningAcademyTopics): boolean {
  return !freeTopicIds(topics).includes(topicId) && !isPro;
}

export function topicById(id: string): ListeningAcademyTopic | undefined {
  return listeningAcademyTopics.find((item) => item.id === id);
}

export function topicForSkillOrSubSkill(key: string): ListeningAcademyTopic | undefined {
  return listeningAcademyTopics.find((item) => item.targetSubSkill === key) ?? listeningAcademyTopics.find((item) => item.targetSkill === key);
}
