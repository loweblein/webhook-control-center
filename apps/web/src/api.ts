const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";

type RequestOptions = {
  method?: string;
  body?: unknown;
  workspaceId?: string | null;
};

export type ApiError = {
  error: { code: string; message: string };
};

export const session = {
  get token() {
    return localStorage.getItem("wcc_token");
  },
  set token(value: string | null) {
    if (value) localStorage.setItem("wcc_token", value);
    else localStorage.removeItem("wcc_token");
  },
  get workspaceId() {
    return localStorage.getItem("wcc_workspace_id");
  },
  set workspaceId(value: string | null) {
    if (value) localStorage.setItem("wcc_workspace_id", value);
    else localStorage.removeItem("wcc_workspace_id");
  }
};

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(session.token ? { authorization: `Bearer ${session.token}` } : {}),
      ...(options.workspaceId ?? session.workspaceId
        ? { "x-workspace-id": options.workspaceId ?? session.workspaceId ?? "" }
        : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({
      error: { code: "REQUEST_FAILED", message: "A requisição falhou" }
    }))) as ApiError;
    throw new Error(payload.error.message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
