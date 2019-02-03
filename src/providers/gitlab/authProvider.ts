import querystring from "querystring";
import uuid from "uuid";

const KEY = 'react-admin.gitlab-provider.token'

export function getToken () {
  return window.localStorage.getItem(KEY) || undefined
}
export function setToken (value: string) {
  return window.localStorage.setItem(KEY, value)
}
export function removeToken () {
  return window.localStorage.removeItem(KEY)
}

export interface AuthOptions {
  baseUrl: string;
  clientId: string;
}

export const initialCheckForToken = () => {
  const qsValue = window.location.hash.replace(/^#\/?/, "");
  if (qsValue) {
    const qs = querystring.parse(qsValue);
    if (typeof qs.access_token === "string") {
      setToken(qs.access_token);
      window.location.hash = "";
    }
  }
};

export const createAuthProvider = (options: AuthOptions) => (
  type: string,
  params: object,
) => {
  if (type === "AUTH_LOGIN") {
    window.location.href = getOAuthRedirect(options);
  }
  if (type === "AUTH_LOGOUT") {
    removeToken();
    return Promise.resolve();
  }
  if (type === "AUTH_ERROR") {
    return Promise.resolve();
  }
  if (type === "AUTH_CHECK") {
    return getToken() ? Promise.resolve() : Promise.reject();
  }
  return Promise.reject("Unknown method");
};

function getOAuthRedirect(options: AuthOptions) {
  const data = querystring.stringify({
    client_id: options.clientId,
    redirect_uri: `${window.location.origin}${window.location.pathname}`,
    response_type: "token",
    scope: "api",
    state: uuid(),
  });
  return `${options.baseUrl || "https://gitlab.com"}/oauth/authorize?${data}`;
}
