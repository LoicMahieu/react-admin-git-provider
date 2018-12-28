import querystring from "querystring";
import { getToken, setToken, removeToken } from "./authToken";
import uuid = require("uuid");

export interface AuthOptions {
  baseUrl: string;
  clientId: string;
  redirectUri: string;
}

export const authProvider = (options: AuthOptions) => (type: string, params: object) => {
  if (type === "AUTH_LOGIN") {
    window.location.href = getRedirectUrl(options);
  }
  if (type === "AUTH_LOGOUT") {
    removeToken();
    return Promise.resolve();
  }
  if (type === "AUTH_ERROR") {
    return Promise.resolve();
  }
  if (type === "AUTH_CHECK") {
    const qsValue = window.location.search.replace(/^\?/, "")
    if (qsValue) {
      const qs = querystring.parse(qsValue);
      if (typeof qs.code === "string") {
        setToken(qs.code);
      }
    }
    return getToken() ? Promise.resolve() : Promise.reject();
  }
  return Promise.reject("Unknown method");
}

function getRedirectUrl(options: AuthOptions) {
  return [
    `${options.baseUrl}/oauth/authorize`,
    "?",
    querystring.stringify({
      client_id: options.clientId,
      redirect_uri: options.redirectUri,
      response_type: "token",
      scope: "api",
      state: uuid(),
    }),
  ].join("");
}
