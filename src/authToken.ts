
const KEY = 'react-admin.gitlab-provider.token'

export function getToken () {
  return window.localStorage.getItem(KEY)
}
export function setToken (value: string) {
  return window.localStorage.setItem(KEY, value)
}
export function removeToken () {
  return window.localStorage.removeItem(KEY)
}

