type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const store = new Map<string, CacheEntry<unknown>>();

export const getOrSetCache = async <T>(key: string, ttlMs: number, factory: () => Promise<T>) => {
  const now = Date.now();
  const existing = store.get(key) as CacheEntry<T> | undefined;
  if (existing && existing.expiresAt > now) {
    return existing.value;
  }

  const value = await factory();
  store.set(key, {
    value,
    expiresAt: now + ttlMs,
  });
  return value;
};

export const clearCache = (prefix?: string) => {
  if (!prefix) {
    store.clear();
    return;
  }

  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
};
