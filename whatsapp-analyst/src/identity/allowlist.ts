import { z } from 'zod';
import { readJsonFile } from '../config.js';

const personaSchema = z.object({
  username: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  suborganization: z.string().min(1),
  tenantValue: z.string().min(1),
});

const allowlistSchema = z.object({
  identities: z.record(z.string(), z.string().min(1)),
  personas: z.record(z.string(), personaSchema),
});

export type Persona = z.infer<typeof personaSchema>;

export interface ResolvedIdentity {
  identityKey: string;
  personaId: string;
  persona: Persona;
}

export class Allowlist {
  private readonly identities: Map<string, string>;
  private readonly personas: Map<string, Persona>;

  constructor(raw: unknown) {
    const parsed = allowlistSchema.parse(raw);
    this.identities = new Map();
    for (const [key, personaId] of Object.entries(parsed.identities)) {
      if (!parsed.personas[personaId]) {
        throw new Error(
          `Allowlist identity "${key}" references unknown persona "${personaId}"`
        );
      }
      this.identities.set(normalizeIdentityKey(key), personaId);
    }
    this.personas = new Map(Object.entries(parsed.personas));
  }

  static fromFile(path: string): Allowlist {
    return new Allowlist(readJsonFile(path));
  }

  static fromJsonString(json: string): Allowlist {
    return new Allowlist(JSON.parse(json) as unknown);
  }

  static fromConfig(config: {
    ALLOWLIST_JSON?: string;
    ALLOWLIST_PATH: string;
  }): Allowlist {
    if (config.ALLOWLIST_JSON) {
      return Allowlist.fromJsonString(config.ALLOWLIST_JSON);
    }
    return Allowlist.fromFile(config.ALLOWLIST_PATH);
  }

  resolve(rawIdentity: string): ResolvedIdentity | null {
    const identityKey = normalizeIdentityKey(rawIdentity);
    const personaId = this.identities.get(identityKey);
    if (!personaId) return null;
    const persona = this.personas.get(personaId);
    if (!persona) return null;
    return { identityKey, personaId, persona };
  }
}

/**
 * Prefer phone/WA id for allowlist matching (demo hosts configure E.164).
 * Keep BSUID as a secondary key when present.
 */
export function extractWhatsAppIdentity(input: {
  from?: string;
  fromUserId?: string;
  contactUserId?: string;
  contactWaId?: string;
}): string | null {
  const phone = pickPhoneIdentity(input);
  if (phone) return phone;
  const bsuid = pickBsuidIdentity(input);
  if (bsuid) return bsuid;
  return null;
}

/** All candidate keys to try against the allowlist (phone first, then BSUID). */
export function identityLookupCandidates(input: {
  from?: string;
  fromUserId?: string;
  contactUserId?: string;
  contactWaId?: string;
}): string[] {
  const out: string[] = [];
  const phone = pickPhoneIdentity(input);
  const bsuid = pickBsuidIdentity(input);
  if (phone) out.push(phone);
  if (bsuid) out.push(bsuid);
  return out;
}

function pickBsuidIdentity(input: {
  fromUserId?: string;
  contactUserId?: string;
}): string | null {
  for (const candidate of [input.fromUserId, input.contactUserId]) {
    if (candidate && /^[A-Z]{2}\./.test(candidate.trim())) {
      return candidate.trim();
    }
  }
  return null;
}

function pickPhoneIdentity(input: {
  from?: string;
  contactWaId?: string;
  fromUserId?: string;
  contactUserId?: string;
}): string | null {
  for (const candidate of [
    input.from,
    input.contactWaId,
    input.fromUserId,
    input.contactUserId,
  ]) {
    if (!candidate?.trim()) continue;
    const trimmed = candidate.trim();
    if (/^[A-Z]{2}\./.test(trimmed)) continue;
    const normalized = normalizeIdentityKey(trimmed);
    if (normalized.startsWith('+') && normalized.length >= 9) {
      return normalized;
    }
  }
  return null;
}

export function normalizeIdentityKey(value: string): string {
  const trimmed = value.trim();
  // BSUID-style ids (e.g. BR.1A2B3C...) — leave as-is (case-sensitive)
  if (/^[A-Z]{2}\./.test(trimmed)) {
    return trimmed;
  }
  // Phone / WA ID: digits with optional leading +
  const digits = trimmed.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) {
    return `+${digits.slice(1).replace(/\D/g, '')}`;
  }
  const onlyDigits = digits.replace(/\D/g, '');
  if (onlyDigits.length >= 8) {
    return `+${onlyDigits}`;
  }
  return trimmed;
}
