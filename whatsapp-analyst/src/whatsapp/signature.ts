import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verify Meta X-Hub-Signature-256 against the exact raw request body.
 */
export function verifyWhatsAppSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  appSecret: string
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }
  const expectedHex = signatureHeader.slice('sha256='.length);
  const digest = createHmac('sha256', appSecret).update(rawBody).digest('hex');

  try {
    const a = Buffer.from(expectedHex, 'hex');
    const b = Buffer.from(digest, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
