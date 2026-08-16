/** Installed @elevenlabs/react. Tests assert this matches package.json. */
export const ELEVENLABS_REACT_VERSION = "1.12.1";

/** Typed return of useConversation().startSession in @elevenlabs/react 1.12.1. */
export const START_SESSION_DECLARED_RETURN = "void";

export type StartSessionInspection = {
  packageVersion: string;
  typeofFn: string;
  constructorName: string;
  declaredReturn: string;
  runtimeReturnType: string;
  runtimeIsPromise: boolean;
};

export function inspectStartSessionFn(fn: unknown): Omit<
  StartSessionInspection,
  "runtimeReturnType" | "runtimeIsPromise"
> {
  const callable = typeof fn === "function" ? fn : null;
  return {
    packageVersion: ELEVENLABS_REACT_VERSION,
    typeofFn: typeof fn,
    constructorName: callable?.constructor?.name ?? "",
    declaredReturn: START_SESSION_DECLARED_RETURN,
  };
}

export function inspectStartSessionReturn(value: unknown): {
  runtimeReturnType: string;
  runtimeIsPromise: boolean;
} {
  const runtimeIsPromise =
    !!value && typeof value === "object" && typeof (value as { then?: unknown }).then === "function";
  return {
    runtimeReturnType: value === undefined ? "undefined" : runtimeIsPromise ? "Promise" : typeof value,
    runtimeIsPromise,
  };
}
