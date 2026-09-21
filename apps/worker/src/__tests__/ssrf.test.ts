import { describe, expect, it } from "vitest";
import { isBlockedIp } from "../ssrf.js";

describe("SSRF private address guard", () => {
  it("blocks private and link-local destinations", () => {
    expect(isBlockedIp("127.0.0.1")).toBe(true);
    expect(isBlockedIp("10.0.0.5")).toBe(true);
    expect(isBlockedIp("192.168.1.2")).toBe(true);
    expect(isBlockedIp("169.254.169.254")).toBe(true);
    expect(isBlockedIp("::1")).toBe(true);
  });

  it("allows public addresses", () => {
    expect(isBlockedIp("8.8.8.8")).toBe(false);
    expect(isBlockedIp("1.1.1.1")).toBe(false);
  });
});
