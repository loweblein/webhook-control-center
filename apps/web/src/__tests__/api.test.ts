import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, session } from "../api.js";

class LocalStorageMock {
  private readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

describe("web API client", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: new LocalStorageMock(),
      configurable: true
    });

    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ id: "key_123" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      }))
    );
  });

  it("does not send a JSON content-type header when the request has no body", async () => {
    session.token = "jwt-token";
    session.workspaceId = "wrk_123";

    await api("/api-keys/key_123/revoke", { method: "POST" });

    const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(init?.body).toBeUndefined();
    expect(init?.headers).toBeInstanceOf(Headers);
    expect((init?.headers as Headers).get("content-type")).toBeNull();
    expect((init?.headers as Headers).get("authorization")).toBe("Bearer jwt-token");
    expect((init?.headers as Headers).get("x-workspace-id")).toBe("wrk_123");
  });

  it("sends JSON content-type when the request has a body", async () => {
    await api("/api-keys", { method: "POST", body: { name: "Produção" } });

    const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(init?.body).toBe(JSON.stringify({ name: "Produção" }));
    expect((init?.headers as Headers).get("content-type")).toBe("application/json");
  });
});
