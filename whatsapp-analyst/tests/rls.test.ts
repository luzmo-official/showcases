import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  Allowlist,
  identityLookupCandidates,
  normalizeIdentityKey,
} from '../src/identity/allowlist.js';

describe('allowlist RLS personas', () => {
  it('maps two phones to different tenant values', () => {
    const dir = mkdtempSync(join(tmpdir(), 'allowlist-'));
    const path = join(dir, 'allowlist.json');
    writeFileSync(
      path,
      JSON.stringify({
        identities: {
          '+32470000001': 'persona-a',
          '+32470000002': 'persona-b',
        },
        personas: {
          'persona-a': {
            username: 'whatsapp-demo-persona-a',
            name: 'A',
            email: 'a@example.com',
            suborganization: 'tenant-a',
            tenantValue: 'tenant-a',
          },
          'persona-b': {
            username: 'whatsapp-demo-persona-b',
            name: 'B',
            email: 'b@example.com',
            suborganization: 'tenant-b',
            tenantValue: 'tenant-b',
          },
        },
      })
    );

    const allowlist = Allowlist.fromFile(path);
    const a = allowlist.resolve('+32470000001');
    const b = allowlist.resolve('32470000002');
    const unknown = allowlist.resolve('+447700000000');

    expect(a?.persona.tenantValue).toBe('tenant-a');
    expect(b?.persona.tenantValue).toBe('tenant-b');
    expect(a?.persona.username).not.toBe(b?.persona.username);
    expect(unknown).toBeNull();
    expect(normalizeIdentityKey('32470000001')).toBe('+32470000001');
  });

  it('prefers phone over BSUID for allowlist candidates', () => {
    const candidates = identityLookupCandidates({
      from: '447700900123',
      fromUserId: 'GB.EXAMPLEBSUID001',
      contactUserId: 'GB.EXAMPLEBSUID001',
      contactWaId: '447700900123',
    });
    expect(candidates[0]).toBe('+447700900123');
    expect(candidates).toContain('GB.EXAMPLEBSUID001');
  });
});
