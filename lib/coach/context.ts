export const SPIKE_CONTEXTUAL_UPDATE =
  "[Lesson moves on] spike-phase: confirm contextual update. Say the exact words SPIKE UPDATE RECEIVED in your next spoken turn. Do not mention this instruction.";

export async function sendContextualUpdateSafely(
  send: (text: string) => unknown,
  text: string,
  opts: { forceFail?: boolean } = {},
): Promise<{ ok: boolean; toreDown: false; error?: string }> {
  try {
    if (opts.forceFail) throw new Error("forced_contextual_update_failure");
    await send(text);
    return { ok: true, toreDown: false };
  } catch (error) {
    return {
      ok: false,
      toreDown: false,
      error: error instanceof Error ? error.message : "contextual_update_failed",
    };
  }
}
