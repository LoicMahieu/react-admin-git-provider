export declare class CacheProvider {
  public get<T = any>(key: string): Promise<T | undefined>;
  public set<T = any>(key: string, data: T): Promise<void>;
  public delete(key: string): Promise<void>;
}
