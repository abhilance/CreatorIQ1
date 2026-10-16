import { useState } from "react";
import { FileText, Sheet, TrendingUp, DollarSign } from "lucide-react";
import { download } from "../lib/api";

export default function Reports() {
  const [handle, setHandle] = useState("@mrbeast");
  const [msg, setMsg] = useState("");
  const get = async (kind, fmt) => {
    setMsg("");
    try { await download(`/api/reports/export?kind=${kind}&fmt=${fmt}&handle=${encodeURIComponent(handle)}`, `${kind}-report.${fmt}`); }
    catch (e) { setMsg(e.message); }
  };
  const Btn = ({ kind, fmt, Icon }) => (
    <button onClick={() => get(kind, fmt)} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#1b2238] bg-[#080b14] py-2.5 text-sm font-semibold hover:border-blue-500">
      <Icon className="h-4 w-4 text-blue-400" />{fmt === "pdf" ? "PDF" : "Excel"}</button>);
  return (
    <div className="min-h-full bg-[#080b14] p-4 text-white sm:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div><h1 className="text-2xl font-bold">Reports &amp; Export</h1><p className="text-sm text-slate-400">Download ready-made reports as PDF or Excel.</p></div>
        {msg && <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{msg}</p>}
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-[#1b2238] bg-[#0e1322] p-6">
            <DollarSign className="mb-3 h-8 w-8 text-emerald-400" /><h2 className="text-lg font-bold">Revenue report</h2>
            <p className="mb-4 mt-1 text-sm text-slate-400">All income and sponsorship entries with totals, pending and overdue amounts.</p>
            <div className="flex gap-3"><Btn kind="revenue" fmt="xlsx" Icon={Sheet} /><Btn kind="revenue" fmt="pdf" Icon={FileText} /></div></div>
          <div className="rounded-2xl border border-[#1b2238] bg-[#0e1322] p-6">
            <TrendingUp className="mb-3 h-8 w-8 text-blue-400" /><h2 className="text-lg font-bold">Growth report</h2>
            <p className="mb-3 mt-1 text-sm text-slate-400">Daily subscribers and views for a YouTube channel we have tracked.</p>
            <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@handle" className="mb-4 w-full rounded-lg border border-[#1b2238] bg-[#080b14] px-3 py-2 text-sm outline-none focus:border-blue-500" />
            <div className="flex gap-3"><Btn kind="growth" fmt="xlsx" Icon={Sheet} /><Btn kind="growth" fmt="pdf" Icon={FileText} /></div></div>
        </div>
      </div>
    </div>
  );
}