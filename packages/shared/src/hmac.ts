import { createHmac, timingSafeEqual } from "node:crypto";

export function signWebhookPayload(params: {
  secret: string;
  timestamp: number | string;
  payload: string;
}): string {
  const signedPayload = `${params.timestamp}.${params.payload}`;
  return createHmac("sha256", params.secret).update(signedPayload).digest("hex");
}

export function formatWebhookSignature(signature: string): string {
  return `v1=${signature}`;
}

export function verifyWebhookSignature(params: {
  secret: string;
  timestamp: number | string;
  payload: string;
  signatureHeader: string;
  toleranceSeconds?: number;
  now?: number;
}): boolean {
  const versionedSignature = params.signatureHeader
    .split(",")
    .map((part) => part.trim())
    .find((part) => part.startsWith("v1="));

  if (!versionedSignature) {
    return false;
  }

  const signature = versionedSignature.slice(3);
  const expected = signWebhookPayload({
    secret: params.secret,
    timestamp: params.timestamp,
    payload: params.payload
  });

  const now = params.now ?? Math.floor(Date.now() / 1000);
  const timestamp = Number(params.timestamp);
  const toleranceSeconds = params.toleranceSeconds ?? 300;

  if (!Number.isFinite(timestamp) || Math.abs(now - timestamp) > toleranceSeconds) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(signature, "hex");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}
