import { stateLabel } from "@/lib/api/academy";

/**
 * A competency's state as a chip.
 *
 * `stateLabel` already turns the backend's raw state into learner
 * wording ("mastered" -> "Sustained"). This adds the colour, using the
 * same four meanings the Academy coverage bar uses, so a state reads
 * identically wherever it appears. An unknown state stays neutral
 * rather than being bucketed into a colour it may not deserve.
 */
export function RecordState({ state }: { state: string }) {
  const key = state.trim().toLowerCase();
  const tone =
    key === "mastered" ? "is-ok" : key === "emerging" ? "is-mid" : key === "weak" ? "is-weak" : "";
  const label = stateLabel(state);
  if (!label) return null;
  return <span className={`records-state ${tone}`.trim()}>{label}</span>;
}
