import querystring from "querystring";
import uuid from "uuid";

const KEY = "react-admin.github-provider.token";

export function getToken() {
  return window.localStorage.getItem(KEY) || undefined;
}
export function setToken(value: string) {
  return window.localStorage.setItem(KEY, value);
}
export function removeToken() {
  return window.localStorage.removeItem(KEY);
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
    return authenticate()
      .then(({ token }) => {
        setToken(token)
        window.location.reload();
      })
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

function getSiteID() {
  const host = document.location.host.split(":")[0];
  return host === "localhost" ? "cms.netlify.com" : host;
}

function authenticate(): Promise<{ token: string }> {
  const options = {
    beta_invite: false,
    invite_code: false,
    login: false,
    provider: "github",
    scope: "repo",
  };
  const baseUrl = "https://api.netlify.com";
  const authEndpoint = "auth";
  const provider = "github";
  const siteID = getSiteID();

  if (!provider) {
    throw new Error(
      "You must specify a provider when calling netlify.authenticate",
    );
  }
  if (!siteID) {
    throw new Error(
      "You must set a site_id with netlify.configure({site_id: 'your-site-id'}) to make authentication work from localhost",
    );
  }

  const conf = {
    height: 600,
    width: 960,
  };
  const left = screen.width / 2 - conf.width / 2;
  const top = screen.height / 2 - conf.height / 2;
  let url = `${baseUrl}/${authEndpoint}?provider=${
    options.provider
  }&site_id=${siteID}`;
  if (options.scope) {
    url += "&scope=" + options.scope;
  }
  if (options.login === true) {
    url += "&login=true";
  }
  if (options.beta_invite) {
    url += "&beta_invite=" + options.beta_invite;
  }
  if (options.invite_code) {
    url += "&invite_code=" + options.invite_code;
  }

  return new Promise((resolve, reject) => {
    const fn = (e: MessageEvent) => {
      if (authWindow && e.data === "authorizing:github") {
        window.removeEventListener("message", fn, false);
        window.addEventListener("message", authorizeCallback, false);
        return authWindow.postMessage(e.data, e.origin);
      }
    };
    const authorizeCallback = (e: MessageEvent) => {
      if (e.origin !== baseUrl) {
        return;
      }

      if (
        e.data.indexOf("authorization:" + options.provider + ":success:") === 0
      ) {
        const data = JSON.parse(
          e.data.match(
            new RegExp("^authorization:" + options.provider + ":success:(.+)$"),
          )[1],
        );
        window.removeEventListener("message", fn, false);
        if (authWindow) {
          authWindow.close();
        }
        resolve(data);
      }
      if (
        e.data.indexOf("authorization:" + options.provider + ":error:") === 0
      ) {
        const err = JSON.parse(
          e.data.match(
            new RegExp("^authorization:" + options.provider + ":error:(.+)$"),
          )[1],
        );
        window.removeEventListener("message", fn, false);
        if (authWindow) {
          authWindow.close();
        }
        reject(new Error(err));
      }
    };
    window.addEventListener("message", fn, false);
    const authWindow = window.open(
      url,
      "Netlify Authorization",
      `width=${conf.width}, height=${conf.height}, top=${top}, left=${left}`,
    );
    if (authWindow) {
      authWindow.focus();
    }
  });
}
