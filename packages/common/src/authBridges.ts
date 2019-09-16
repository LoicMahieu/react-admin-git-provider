export declare class AbstractAuthBridge {
  public getToken(): string | undefined;
  public setToken(value: string): void;
  public removeToken(): void;
}

export class LocalStorageAuthBridge implements AbstractAuthBridge {
  private key: string;

  constructor(key = "react-admin.gitlab-provider.token") {
    this.key = key;
  }
  public getToken() {
    return window.localStorage.getItem(this.key) || undefined;
  }
  public setToken(value: string) {
    window.localStorage.setItem(this.key, value);
  }
  public removeToken() {
    window.localStorage.removeItem(this.key);
  }
}

export class StaticAuthBridge implements AbstractAuthBridge {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }
  public getToken() {
    return this.token;
  }
  public setToken(value: string) {
    // No need
  }
  public removeToken() {
    // No need
  }
}
