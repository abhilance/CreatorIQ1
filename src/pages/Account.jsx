import { useEffect, useState } from "react";
import { json, api, getMe, resetMe } from "../lib/api";

const ROLES = { creator: "Creator", agency: "Agency", marketing: "Marketing Team", admin: "Administrator" };
const inp = "w-full rounded-lg border border-[#1b2238] bg-[#080b14] px-3 py-2.5 text-sm outline-none focus:border-blue-500";

export default function Account() {
  const [me, setMe] = useState(null);
  const [name, setName] = useState("");
  const [pw, setPw] = useState({ current_password: "", new_password: "" });
  const [msg, setMsg] = useState({ type: "", text: "" });
  useEffect(() => { getMe().then((m) => { setMe(m); setName(m.full_name); }); }, []);
  const say = (type, text) => setMsg({ type, text });
  const saveName = async (e) => {
    e.preventDefault();
    try { const m = await json("/api/me", { method: "PUT", body: JSON.stringify({ full_name: name }) }); resetMe(); setMe(m); say("ok", "Name saved"); } catch (err) { say("err", err.message); }
  };
  const savePw = async (e) => {
    e.preventDefault();
    try { await api("/api/me/password", { method: "POST", body: JSON.stringify(pw) }); setPw({ current_password: "", new_password: "" }); say("ok", "Password changed"); } catch (err) { say("err", err.message); }
  };
  return (
    <div className="min-h-full bg-[#080b14] p-4 text-white sm:p-8">
      <div className="mx-auto max-w-xl space-y-6">
        <div><h1 className="text-2xl font-bold">Account settings</h1>{me && <p className="text-sm text-slate-400">{me.email} · <span className="text-blue-300">{ROLES[me.role]}</span></p>}</div>
        {msg.text && <p className={`rounded-xl border p-3 text-sm ${msg.type === "ok" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300"}`}>{msg.text}</p>}
        <form onSubmit={saveName} className="space-y-3 rounded-2xl border border-[#1b2238] bg-[#0e1322] p-6">
          <h2 className="font-bold">Profile</h2>
          <input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" maxLength={80} />
          <button className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500">Save name</button>
        </form>
        <form onSubmit={savePw} className="space-y-3 rounded-2xl border border-[#1b2238] bg-[#0e1322] p-6">
          <h2 className="font-bold">Change password</h2>
          <input className={inp} type="password" required placeholder="Current password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} />
          <input className={inp} type="password" required minLength={8} placeholder="New password (8+ characters)" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} />
          <button className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500">Update password</button>
        </form>
      </div>
    </div>
  );
}