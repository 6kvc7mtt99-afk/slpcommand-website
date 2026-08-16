const KEY_RE = /^[A-Za-z0-9:_-]{1,200}$/;

export function newIdempotencyKey(prefix = ""): string {
  const id = crypto.randomUUID();
  const key = prefix ? `${prefix}${id}` : id;
  if (!KEY_RE.test(key)) throw new Error("invalid_idempotency_key");
  return key;
}

export function isClientIdempotencyKey(value: string): boolean {
  return KEY_RE.test(value);
}

export function examIntentKey(userId: string, skill: "reading" | "listening", day = new Date()): string {
  const y = day.getUTCFullYear();
  const m = String(day.getUTCMonth() + 1).padStart(2, "0");
  const d = String(day.getUTCDate()).padStart(2, "0");
  return `exam-idemp:${userId}:${skill}:${y}-${m}-${d}`;
}

const memoryKeys = new Map<string, string>();

export function persistentClientKey(storageKey: string): string {
  try {
    const existing = sessionStorage.getItem(storageKey) ?? memoryKeys.get(storageKey);
    if (existing) {
      memoryKeys.set(storageKey, existing);
      return existing;
    }
    const created = newIdempotencyKey();
    memoryKeys.set(storageKey, created);
    sessionStorage.setItem(storageKey, created);
    return created;
  } catch {
    const existing = memoryKeys.get(storageKey);
    if (existing) return existing;
    const created = newIdempotencyKey();
    memoryKeys.set(storageKey, created);
    return created;
  }
}

export function clearPersistentClientKey(storageKey: string): void {
  memoryKeys.delete(storageKey);
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    /* ignore */
  }
}
