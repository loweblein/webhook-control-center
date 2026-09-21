import dns from "node:dns/promises";
import net from "node:net";

const blockedHostnames = new Set(["localhost", "0.0.0.0"]);

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  const [a, b] = parts;
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return true;
  }

  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && typeof b === "number" && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    a === 0 ||
    a === 100 ||
    a === 224 ||
    a === 255
  );
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.includes("169.254.169.254")
  );
}

export function isBlockedIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) {
    return isPrivateIPv4(ip);
  }
  if (version === 6) {
    return isPrivateIPv6(ip);
  }
  return true;
}

export async function assertSafeWebhookUrl(rawUrl: string): Promise<void> {
  const url = new URL(rawUrl);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Webhook URL must use http or https");
  }

  const hostname = url.hostname.toLowerCase();
  if (blockedHostnames.has(hostname) || hostname.endsWith(".localhost")) {
    throw new Error("Webhook URL hostname is blocked");
  }

  if (net.isIP(hostname) && isBlockedIp(hostname)) {
    throw new Error("Webhook URL resolves to a private address");
  }

  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (records.length === 0 || records.some((record) => isBlockedIp(record.address))) {
    throw new Error("Webhook URL resolves to a private address");
  }
}
