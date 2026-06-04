"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Lock, Leaf } from "lucide-react";

const SESSION_KEY = "milokira-admin-auth";

export default function AdminGuard({ children }: { readonly children: ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "authed" | "denied">("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const authed = sessionStorage.getItem(SESSION_KEY) === "true";
    setStatus(authed ? "authed" : "denied");
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expected = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
    if (!expected) {
      setError("Configuración faltante. Contacta al administrador.");
      return;
    }
    if (password === expected) {
      sessionStorage.setItem(SESSION_KEY, "true");
      setStatus("authed");
      setError("");
    } else {
      setError("Clave incorrecta");
      setPassword("");
    }
  };

  if (status === "checking") {
    return (
      <div className="min-h-screen bg-milokira-crema flex items-center justify-center">
        <div className="w-10 h-10 border-[3px] border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "denied") {
    return (
      <main className="min-h-screen bg-milokira-crema text-stone-800 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-gradient-to-br from-white to-stone-50 border border-stone-200 rounded-2xl p-8 shadow-2xl">
          <div className="flex justify-center mb-5">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/30 rounded-2xl blur-xl" />
              <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-900/40">
                <Lock size={24} className="text-white" strokeWidth={2.5} />
              </div>
            </div>
          </div>

          <h1 className="text-xl font-black text-center tracking-tight mb-1">
            Acceso restringido
          </h1>
          <p className="text-center text-stone-500 text-sm mb-6">
            Ingresa la clave para continuar al panel.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                autoFocus
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Clave secreta"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 placeholder-stone-400 outline-none focus:bg-white focus:border-milokira-verde transition-colors text-sm"
              />
              {error && (
                <p className="text-rose-400 text-xs font-semibold mt-2 text-center">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-emerald-900/40 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Leaf size={16} strokeWidth={2.5} />
              Entrar
            </button>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="w-full text-stone-500 hover:text-stone-700 text-xs font-semibold py-1 transition-colors"
            >
              Volver al catálogo
            </button>
          </form>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
