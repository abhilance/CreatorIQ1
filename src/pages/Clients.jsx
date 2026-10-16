import { useEffect, useState } from "react";
import { UserPlus, Trash2 } from "lucide-react";
import { json, api } from "../lib/api";

const usd = (n) => "$" + Number(n || 0).toLocaleString("en", { maximumFractionDigits: 0 });

export default function Clients() {
  const [list, setList] = useState([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const load = () => json("/api/agency/clients").then(setList).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  const add = async (e) => {
    e.preventDefault(); setError("");
    try { await api("/api/agency/clients", { method: "POST", body: JSON.stringify({ email }) }); setEmail(""); load(); } catch (err) { setError(err.message); }
  };
  const remove = async (id) => { if (confirm("Remove this client?")) { await api(`/api/agency/clients/${id}`, { method: "DELETE" }); load(); } };
  const total = list.reduce((a, c) => a + c.total_earned, 0);
  return (
    <div className="min-h-full bg-[#080b14] p-4 text-white sm:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div><h1 className="text-2xl font-bold">Clients</h1><p className="text-sm text-slate-400">Creators you manage. Add them by the email they signed up with.</p></div>
        <form onSubmit={add} className="flex gap-3">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="creator@email.com" className="flex-1 rounded-xl border border-[#1b2238] bg-[#0e1322] px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
          <button className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500"><UserPlus className="h-4 w-4" />Add client</button>
        </form>
        {error && <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#1b2238] bg-[#0e1322] p-5"><p className="text-sm text-slate-400">Clients</p><p className="text-3xl font-bold">{list.length}</p></div>
          <div className="rounded-2xl border border-[#1b2238] bg-[#0e1322] p-5"><p className="text-sm text-slate-400">Combined earnings</p><p className="text-3xl font-bold">{usd(total)}</p></div>
        </div>
        {list.length === 0 && <p className="py-12 text-center text-slate-400">No clients yet.</p>}
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((c) => (
            <div key={c.id} className="rounded-2xl border border-[#1b2238] bg-[#0e1322] p-5">
              <div className="mb-3 flex items-start justify-between"><div><p className="font-bold">{c.name}</p><p className="text-xs text-slate-400">{c.email}</p></div>
                <button aria-label="Remove client" onClick={() => remove(c.id)} className="p-1 text-slate-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></button></div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-slate-400">Total earned</p><p className="text-lg font-bold">{usd(c.total_earned)}</p></div>
                <div><p className="text-slate-400">This month</p><p className="text-lg font-bold">{usd(c.this_month)}</p></div>
                <div><p className="text-slate-400">Pending</p><p className="font-semibold text-amber-300">{usd(c.pending)}</p></div>
                <div><p className="text-slate-400">Overdue</p><p className="font-semibold text-red-400">{usd(c.overdue)}</p></div>
              </div>
              <p className="mt-3 text-xs text-slate-400">Top brand: {c.top_brand || "–"}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">{c.by_source.map((s) => <span key={s.source} className="rounded-full bg-[#1b2238] px-2.5 py-0.5 text-xs">{s.source} {usd(s.amount)}</span>)}</div>
            </div>))}
        </div>
      </div>
    </div>
  );
}