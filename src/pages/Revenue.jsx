import { useEffect, useState } from "react";
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Plus, Pencil, Trash2, Download, X, ArrowUp, ArrowDown, Sparkles } from "lucide-react";
import { json, api, download } from "../lib/api";

const SOURCES = ["Sponsorship", "Ad Revenue", "Affiliate Marketing", "Brand Collaboration", "Subscription"];
const COLORS = ["#1a6dff", "#ff8a2b", "#12d08a", "#a855f7", "#f43f5e"];
const usd = (n) => "$" + Number(n || 0).toLocaleString("en", { maximumFractionDigits: 0 });
const PILL = { paid: "bg-emerald-500/15 text-emerald-300", pending: "bg-amber-500/15 text-amber-300", overdue: "bg-red-500/15 text-red-300" };
const EMPTY = { source: "Sponsorship", brand: "", platform: "YouTube", amount: "", date: new Date().toISOString().slice(0, 10), status: "paid", notes: "" };
const Card = ({ className = "", children }) => <div className={`rounded-2xl border border-[#1b2238] bg-[#0e1322] p-5 ${className}`}>{children}</div>;
const inp = "w-full rounded-lg border border-[#1b2238] bg-[#080b14] px-3 py-2 text-sm outline-none focus:border-blue-500";

export default function Revenue() {
  const [rows, setRows] = useState([]);
  const [sum, setSum] = useState(null);
  const [form, setForm] = useState(null);
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try { const [r, s] = await Promise.all([json("/api/revenue"), json("/api/revenue/summary")]); setRows(r); setSum(s); }
    catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const body = JSON.stringify({ ...form, amount: parseFloat(form.amount) });
      await api(form.id ? `/api/revenue/${form.id}` : "/api/revenue", { method: form.id ? "PUT" : "POST", body });
      setForm(null); await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const remove = async (id) => { if (confirm("Delete this entry?")) { await api(`/api/revenue/${id}`, { method: "DELETE" }); load(); } };
  const demo = async () => { await api("/api/revenue/demo", { method: "POST" }); load(); };
  const clearAll = async () => { if (confirm("Delete ALL income entries and their alerts? This cannot be undone.")) { await api("/api/revenue", { method: "DELETE" }); load(); } };
  const exp = (fmt) => download(`/api/reports/export?kind=revenue&fmt=${fmt}`, `revenue-report.${fmt}`).catch((e) => setError(e.message));

  const shown = rows.filter((r) => filter === "All" || r.source === filter);
  const ch = sum?.month_change_pct;

  return (
    <div className="min-h-full bg-[#080b14] p-4 text-white sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-2xl font-bold">Revenue &amp; Sponsorships</h1><p className="text-sm text-slate-400">Track every income source, sponsorship payment and trend.</p></div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => exp("xlsx")} className="flex items-center gap-2 rounded-xl border border-[#1b2238] px-4 py-2 text-sm hover:bg-[#131a2e]"><Download className="h-4 w-4" />Excel</button>
            <button onClick={() => exp("pdf")} className="flex items-center gap-2 rounded-xl border border-[#1b2238] px-4 py-2 text-sm hover:bg-[#131a2e]"><Download className="h-4 w-4" />PDF</button>
            <button onClick={() => setForm(EMPTY)} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500"><Plus className="h-4 w-4" />Add income</button>
          </div>
        </div>
        {error && <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

        {sum && (<>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card><p className="text-sm text-slate-400">Total earned</p><p className="mt-1 text-3xl font-bold">{usd(sum.total_earned)}</p><p className="mt-1 text-xs text-slate-500">Top brand: {sum.top_brand || "–"}</p></Card>
            <Card><p className="text-sm text-slate-400">This month</p><p className="mt-1 text-3xl font-bold">{usd(sum.this_month)}</p>
              {ch != null && <p className={`mt-1 flex items-center gap-1 text-xs font-semibold ${ch >= 0 ? "text-emerald-400" : "text-red-400"}`}>{ch >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}{Math.abs(ch)}% vs last month</p>}</Card>
            <Card><p className="text-sm text-slate-400">Pending</p><p className="mt-1 text-3xl font-bold text-amber-300">{usd(sum.pending)}</p><p className="mt-1 text-xs text-slate-500">Awaiting payment</p></Card>
            <Card><p className="text-sm text-slate-400">Overdue</p><p className="mt-1 text-3xl font-bold text-red-400">{usd(sum.overdue)}</p><p className="mt-1 text-xs text-slate-500">Past the due date</p></Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
            <Card><h2 className="mb-3 text-lg font-bold">Revenue trend (12 months)</h2>
              <div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={sum.monthly}>
                <defs><linearGradient id="rv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a6dff" stopOpacity={0.5} /><stop offset="100%" stopColor="#1a6dff" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="#1e2538" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#8b93ad", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(m) => new Date(m + "-01").toLocaleDateString("en", { month: "short" })} />
                <YAxis tick={{ fill: "#8b93ad", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={usd} width={60} />
                <Tooltip formatter={usd} contentStyle={{ background: "#0e1322", border: "1px solid #1b2238", borderRadius: 12 }} />
                <Area dataKey="amount" name="Earned" stroke="#1a6dff" strokeWidth={2} fill="url(#rv)" /></AreaChart></ResponsiveContainer></div></Card>
            <Card><h2 className="mb-3 text-lg font-bold">By source</h2>
              <div className="h-40"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={sum.by_source} dataKey="amount" nameKey="source" innerRadius={42} outerRadius={70} stroke="none">
                {sum.by_source.map((s) => <Cell key={s.source} fill={COLORS[SOURCES.indexOf(s.source)]} />)}</Pie><Tooltip formatter={usd} contentStyle={{ background: "#0e1322", border: "1px solid #1b2238", borderRadius: 12 }} /></PieChart></ResponsiveContainer></div>
              {sum.by_source.map((s) => (<div key={s.source} className="flex items-center justify-between py-1 text-sm"><span><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLORS[SOURCES.indexOf(s.source)] }} />{s.source}</span><b>{usd(s.amount)}</b></div>))}</Card>
          </div>
        </>)}

        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Income &amp; sponsorship log</h2>
            <div className="flex gap-2">{rows.length > 0 && <button onClick={clearAll} className="flex items-center gap-2 rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"><Trash2 className="h-4 w-4" />Clear all</button>}<select value={filter} onChange={(e) => setFilter(e.target.value)} className={inp + " !w-auto"}>{["All", ...SOURCES].map((s) => <option key={s}>{s}</option>)}</select></div></div>
          {rows.length === 0 ? (
            <div className="py-10 text-center text-slate-400"><p>No income recorded yet.</p>
              <button onClick={demo} className="mx-auto mt-3 flex items-center gap-2 rounded-xl border border-[#1b2238] px-4 py-2 text-sm text-white hover:bg-[#131a2e]"><Sparkles className="h-4 w-4 text-amber-300" />Load demo data</button></div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
              <thead><tr className="text-left text-slate-400"><th className="py-3">Date</th><th>Brand / description</th><th>Source</th><th>Amount</th><th>Status</th><th /></tr></thead>
              <tbody>{shown.map((r) => (
                <tr key={r.id} className="border-t border-[#1b2238]"><td className="py-3">{r.date}</td><td>{r.brand || "–"}</td><td>{r.source}</td><td className="font-semibold">{usd(r.amount)}</td>
                  <td><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${PILL[r.status]}`}>{r.status}</span></td>
                  <td className="text-right"><button aria-label="Edit" onClick={() => setForm(r)} className="p-2 text-slate-400 hover:text-white"><Pencil className="h-4 w-4" /></button>
                    <button aria-label="Delete" onClick={() => remove(r.id)} className="p-2 text-slate-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></button></td></tr>))}</tbody></table></div>)}
        </Card>
      </div>

      {form && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setForm(null)}>
          <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-md space-y-3 rounded-2xl border border-[#1b2238] bg-[#0e1322] p-6">
            <div className="flex items-center justify-between"><h3 className="text-lg font-bold">{form.id ? "Edit income" : "Add income"}</h3><button type="button" aria-label="Close" onClick={() => setForm(null)}><X className="h-5 w-5" /></button></div>
            <select className={inp} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select>
            <input className={inp} placeholder="Brand or description" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <input className={inp} type="number" min="0.01" step="0.01" required placeholder="Amount ($)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              <input className={inp} type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <select className={inp} value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>{["YouTube", "Instagram", "TikTok", "Facebook", "X", "LinkedIn", "Other"].map((s) => <option key={s}>{s}</option>)}</select>
              <select className={inp} value={form.status === "overdue" ? "pending" : form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="paid">Paid</option><option value="pending">Pending</option></select></div>
            <button disabled={busy} className="w-full rounded-xl bg-blue-600 py-2.5 font-semibold hover:bg-blue-500 disabled:opacity-60">{busy ? "Saving…" : "Save"}</button>
          </form>
        </div>)}
    </div>
  );
}