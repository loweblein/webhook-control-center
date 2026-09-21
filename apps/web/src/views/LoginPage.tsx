import { ArrowsClockwise } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { api, session } from "../api.js";
import type { Workspace } from "../types.js";

type LoginResponse = {
  token: string;
  user: { id: string; email: string; name: string };
  workspaces: Workspace[];
};

export function LoginPage() {
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const login = useMutation({
    mutationFn: () => api<LoginResponse>("/auth/login", { method: "POST", body: { email, password } }),
    onSuccess: (data) => {
      session.token = data.token;
      session.workspaceId = data.workspaces[0]?.id ?? null;
      window.location.href = "/overview";
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Falha ao entrar")
  });

  if (session.token) {
    return <Navigate to="/overview" replace />;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    login.mutate();
  }

  return (
    <main className="grid min-h-[100dvh] bg-slate-950 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="flex items-center px-8 py-12 text-white lg:px-16">
        <div className="max-w-xl">
          <div className="mb-8 grid size-12 place-items-center rounded-lg bg-emerald-500 text-slate-950">
            <ArrowsClockwise size={25} weight="bold" />
          </div>
          <h1 className="text-4xl font-semibold leading-tight md:text-6xl">Entrega de webhooks com observabilidade de verdade.</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
            Gerencie endpoints, receba eventos, inspecione retries, reexecute falhas e valide isolamento por workspace
            em um painel com cara de produção.
          </p>
        </div>
      </section>
      <section className="flex items-center bg-[#f6f8fb] px-6 py-10 dark:bg-[#0b1020]">
        <form onSubmit={submit} className="mx-auto w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-soft dark:border-dark-line dark:bg-dark-panel dark:shadow-soft-dark">
          <h2 className="text-xl font-semibold text-slate-950 dark:text-slate-50">Entrar</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Use a conta demo do seed ou cadastre um usuário pela API.</p>
          <label className="mt-6 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Email
            <input
              className="mt-2 w-full rounded-md border-line dark:border-dark-line dark:bg-slate-950 dark:text-slate-100"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Senha
            <input
              className="mt-2 w-full rounded-md border-line dark:border-dark-line dark:bg-slate-950 dark:text-slate-100"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
          <button
            disabled={login.isPending}
            className="mt-6 w-full rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
          >
            {login.isPending ? "Entrando" : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
