import { useQuery } from "@tanstack/react-query";
import { api } from "../api.js";
import type { Workspace } from "../types.js";
import { Panel } from "../ui/Panel.js";

const verificationSnippet = `const crypto = require("crypto");

function verify({ secret, timestamp, payload, signatureHeader }) {
  const signature = signatureHeader.split(",").find((part) => part.startsWith("v1="))?.slice(3);
  const expected = crypto
    .createHmac("sha256", secret)
    .update(\`\${timestamp}.\${payload}\`)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
}`;

export function SettingsPage() {
  const workspaces = useQuery({ queryKey: ["workspaces"], queryFn: () => api<Workspace[]>("/workspaces") });

  return (
    <div className="space-y-6">
      <Panel title="Workspace">
        <div className="grid gap-4 md:grid-cols-2">
          {workspaces.data?.map((workspace) => (
            <div key={workspace.id} className="rounded-lg border border-line bg-white p-4 dark:border-dark-line dark:bg-slate-950/40">
              <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{workspace.name}</p>
              <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">{workspace.id}</p>
              <p className="mt-3 text-xs font-semibold text-emerald-700">{workspace.role}</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Assinatura de webhooks">
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            <p>Cada delivery é assinada com HMAC SHA-256 usando o secret do endpoint.</p>
            <p>Headers enviados em todo POST:</p>
            <ul className="space-y-2 font-mono text-xs text-slate-700 dark:text-slate-200">
              <li>x-webhook-id</li>
              <li>x-webhook-timestamp</li>
              <li>x-webhook-signature</li>
            </ul>
            <p>O conteúdo assinado é <code className="rounded bg-slate-100 px-1 dark:bg-slate-800 dark:text-slate-100">timestamp.payload</code>.</p>
          </div>
          <pre className="code-scroll overflow-auto rounded-md bg-slate-950 p-4 text-xs leading-6 text-slate-100">
            {verificationSnippet}
          </pre>
        </div>
      </Panel>
    </div>
  );
}
