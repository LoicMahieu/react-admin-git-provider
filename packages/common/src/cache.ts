import { createInstance } from "localforage";

const cacheInstanceCache = new Map();
const getCacheStore = (storeName: string) => {
  if (cacheInstanceCache.has(storeName)) {
    return cacheInstanceCache.get(storeName);
  }
  const store = createInstance({
    name: "react-admin-git-provider",
    storeName,
  });

  cacheInstanceCache.set(storeName, store);

  return store;
};

export const cacheStoreGetOrSet = async (
  storeName: string,
  key: string,
  getFn: () => Promise<any>,
  checkFn?: (cached: any) => boolean | null | undefined,
) => {
  const cacheStore = getCacheStore(storeName);
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
