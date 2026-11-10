/** Capture each snapshot at request time and persist in order. A failed write
 * must stay retryable and must never poison later saves. */
export function createScormSaveQueue(persist: (snapshot: string) => Promise<boolean>, initialSnapshot = "") {
  let saved = initialSnapshot;
  let queue = Promise.resolve(true);
  return (snapshot: string) => {
    queue = queue.catch(() => false).then(async () => {
      if (snapshot === saved) return true;
      try {
        const ok = await persist(snapshot);
        if (ok) saved = snapshot;
        return ok;
      } catch { return false; }
    });
    return queue;
  };
}
