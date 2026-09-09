"use client";

/**
 * A short-lived, in-memory answer to a request the navigation keeps repeating.
 *
 * The header mounts fresh on every screen, so its two reads — the signed-in
 * account's photo and their reminders — went to the network on every click.
 * Neither changes between one screen and the next, and both are behind
 * no-store, so nothing else was going to stop them.
 *
 * The store is a module variable: it lives as long as the tab's copy of the
 * app, is per-origin by construction, and is gone on a reload. Nothing is
 * written to disk — a shared device keeps none of it after the tab closes.
 */
type Entry = { value: unknown; at: number; inFlight?: Promise<unknown> };

const store = new Map<string, Entry>();

/**
 * Reads through the cache, sharing one request between callers that ask at
 * once. A fresh enough answer is returned as it stands.
 */
export function cachedFetch<T>(
  key: string,
  load: () => Promise<T>,
  ttlMs: number,
): Promise<T> {
  const hit = store.get(key);
  const now = Date.now();

  if (hit) {
    if (hit.inFlight) return hit.inFlight as Promise<T>;
    if (now - hit.at < ttlMs) return Promise.resolve(hit.value as T);
  }

  const inFlight = load()
    .then((value) => {
      store.set(key, { value, at: Date.now() });
      return value;
    })
    .catch((error) => {
      // A failed read caches nothing: the next screen tries again.
      store.delete(key);
      throw error;
    });

  store.set(key, { value: hit?.value, at: hit?.at ?? 0, inFlight });

  return inFlight;
}

/** Replaces what the cache holds, for a caller that has just changed it. */
export function putCached<T>(key: string, value: T): void {
  store.set(key, { value, at: Date.now() });
}

/** Drops an entry, so the next read goes to the network. */
export function invalidateCached(key: string): void {
  store.delete(key);
}
