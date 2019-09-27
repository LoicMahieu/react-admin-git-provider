import { CacheProvider } from "./CacheProvider";

export class DisabledCacheProvider implements CacheProvider {
  public async get(key: string) {
    return undefined;
  }
  public async set(key: string, value: any) {
    // none
  }
  public async delete(key: string) {
    // none
  }
}
