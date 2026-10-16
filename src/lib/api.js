export const API = "http://127.0.0.1:8000";

export async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}`, ...opts.headers },
  });
  if (res.status === 401) { localStorage.removeItem("token"); window.location.href = "/auth"; throw new Error("Session expired"); }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Request failed");
  return res;
}
export const json = async (p, o) => (await api(p, o)).json();

export async function download(path, filename) {
  const blob = await (await api(path)).blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  URL.revokeObjectURL(a.href);
}

// Current user (id, email, role, full_name). Cached per login token, so switching accounts refetches.
let meCache = { token: null, promise: null };
export const getMe = () => {
  const token = localStorage.getItem("token");
  if (meCache.token !== token || !meCache.promise) {
    meCache = { token, promise: json("/api/me").catch((e) => { meCache = { token: null, promise: null }; throw e; }) };
  }
  return meCache.promise;
};
export const resetMe = () => { meCache = { token: null, promise: null }; };