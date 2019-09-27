import { CacheProvider } from "@react-admin-git-provider/common";
import Keyv from "keyv";

export class LocalforageCacheProvider implements CacheProvider {
  private readonly keyv: Keyv;

  constructor({ keyv }: { keyv: Keyv }) {
    this.keyv = keyv;
  }

  public async get<T = any>(key: string) {
    return (this.keyv.get(key) as any) as T;
  }
  public async set(key: string, value: any) {
    await this.keyv.set(key, value);
  }
  public async delete(key: string) {
    await this.keyv.delete(key);
  }
}
