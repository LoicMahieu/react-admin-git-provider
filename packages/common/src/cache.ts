import { CacheProvider } from "./cacheProviders";

export const cacheStoreGetOrSet = async (
  cacheProvider: CacheProvider,
  key: string,
  getFn: () => Promise<any>,
  checkFn?: (cached: any) => boolean | null | undefined,
) => {
  const cached = await cacheProvider.get(key);
  if (cached) {
    const check = typeof checkFn === "function" ? checkFn(cached) : true;
    if (check) {
      return cached;
    } else {
      console.warn("cached invalidation for", key);
    }
  }
  const value = await getFn();

  try {
    await cacheProvider.set(key, value);
  } catch (err) {
    console.error(err);
  }

  return value;
};
