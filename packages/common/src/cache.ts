import { createInstance as createCacheInstance } from "localforage";

export type CacheStore = LocalForage;
export { createCacheInstance };

export const cacheStoreGetOrSet = async (
  cacheStore: LocalForage,
  key: string,
  getFn: () => Promise<any>,
  checkFn?: (cached: any) => boolean | null | undefined,
) => {
  const cached = await cacheStore.getItem(key);
  if (cached) {
    const check = typeof checkFn === "function" ? checkFn(cached) : true;
    if (check) {
      return cached;
    } else {
      console.warn("cached invalidation for", key);
    }
  }
  const value = await getFn();
  await cacheStore.setItem(key, value);
  return value;
};
