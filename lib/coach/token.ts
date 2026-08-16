const TOKEN_HINT = /conversationtoken|conversation_token|signedurl|signed_url/i;

export function redactToken(token: string): string {
  const length = token.length;
  if (length === 0) return "[redacted len=0]";
  return `[redacted len=${length} prefix=${token.slice(0, 3)}]`;
}

export function looksLikeJwt(value: string): boolean {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

export function storageContainsTokenHint(storage: Storage): boolean {
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i) ?? "";
    const value = storage.getItem(key) ?? "";
    if (TOKEN_HINT.test(key) || TOKEN_HINT.test(value)) return true;
    if (value.length > 40 && looksLikeJwt(value)) return true;
  }
  return false;
}

export function tokenPersistenceSafe(): { localStorage: boolean; sessionStorage: boolean } {
  if (typeof window === "undefined") return { localStorage: true, sessionStorage: true };
  try {
    return {
      localStorage: !storageContainsTokenHint(window.localStorage),
      sessionStorage: !storageContainsTokenHint(window.sessionStorage),
    };
  } catch {
    return { localStorage: true, sessionStorage: true };
  }
}
