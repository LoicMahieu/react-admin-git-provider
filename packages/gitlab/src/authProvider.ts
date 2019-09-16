import {
  AbstractAuthBridge,
  LocalStorageAuthBridge,
} from "@react-admin-git-provider/common";
import querystring from "querystring";

export const defaultAuthBridge = new LocalStorageAuthBridge();

export interface AuthOptions {
  baseUrl: string;
  clientId: string;
  authBridge?: AbstractAuthBridge;
}

export const initialCheckForToken = (
  authBridge: AbstractAuthBridge = new LocalStorageAuthBridge(),
) => {
  const qsValue = window.location.hash.replace(/^#\/?/, "");
  if (qsValue) {
    const qs = querystring.parse(qsValue);
    if (typeof qs.access_token === "string") {
      authBridge.setToken(qs.access_token);
      window.location.hash = "";
    }
  }
};

export const createAuthProvider = (options: AuthOptions) => {
  const authBridge = options.authBridge || new LocalStorageAuthBridge();
  return (type: string, params: object) => {
    if (type === "AUTH_LOGIN") {
      window.location.href = getOAuthRedirect(options);
    }
    if (type === "AUTH_LOGOUT") {
      authBridge.removeToken();
      return Promise.resolve();
    }
    if (type === "AUTH_ERROR") {
      return Promise.resolve();
    }
    if (type === "AUTH_CHECK") {
      return authBridge.getToken()
        ? Promise.resolve()
        : Promise.reject();
    }
    return Promise.reject("Unknown method");
  };
};

function getOAuthRedirect(options: AuthOptions) {
  const data = querystring.stringify({
    client_id: options.clientId,
    redirect_uri: `${window.location.origin}${window.location.pathname}`,
    response_type: "token",
    scope: "api",
    state: new Date().toString(),
  });
  return `${options.baseUrl || "https://gitlab.com"}/oauth/authorize?${data}`;
}
