import { useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { getMe } from "../lib/api";

export default function RoleRoute({ roles, children }) {
  const [state, setState] = useState("loading");
  useEffect(() => {
    getMe().then((m) => setState(roles.includes(m.role) ? "ok" : "denied")).catch(() => setState("denied"));
  }, [roles]);
  if (state === "loading") return <div className="grid h-full place-items-center bg-[#080b14] py-24"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
  if (state === "denied")
    return (
      <div className="grid min-h-full place-items-center bg-[#080b14] p-8 text-center text-white">
        <div><ShieldAlert className="mx-auto mb-3 h-12 w-12 text-amber-400" /><h1 className="text-xl font-bold">You don't have access to this page</h1>
          <p className="mt-1 text-sm text-slate-400">Your role does not include this feature. Ask an administrator if you need it.</p></div>
      </div>);
  return children;
}