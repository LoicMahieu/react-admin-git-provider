import { createInstance } from "localforage";
import { CacheProvider } from "./CacheProvider";

export class LocalforageCacheProvider implements CacheProvider {
  private readonly store: LocalForage;

  constructor({ storeName }: { storeName: string }) {
    this.store = createInstance({
      name: "react-admin-git-provider",
      storeName,
    });
  }

  public async get<T = any>(key: string) {
    return (this.store.getItem(key) as any) as T;
  }
  public async set(key: string, value: any) {
    await this.store.setItem(key, value);
  }
  public async delete(key: string) {
    await this.store.removeItem(key);
  }
}
