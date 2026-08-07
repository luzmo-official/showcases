import { describe, expect, it } from 'vitest';
import {
  timingSafeStringEqual,
  verifyWhatsAppSignature,
} from '../src/whatsapp/signature.js';
import { createHmac } from 'node:crypto';
import { extractInboundTextMessages } from '../src/whatsapp/webhook.js';
import {
  markdownToWhatsApp,
  splitWhatsAppText,
} from '../src/whatsapp/formatting.js';
import {
  normalizeIdentityKey,
  Allowlist,
} from '../src/identity/allowlist.js';
import { looksOffTopic } from '../src/core/orchestrator.js';

describe('signature', () => {
  it('accepts a valid signature', () => {
    const body = Buffer.from('{"object":"whatsapp_business_account"}');
    const secret = 'test-secret';
    const digest = createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyWhatsAppSignature(body, `sha256=${digest}`, secret)).toBe(
      true
    );
  });

  it('rejects an invalid signature', () => {
    const body = Buffer.from('{"object":"whatsapp_business_account"}');
    expect(
      verifyWhatsAppSignature(body, 'sha256=deadbeef', 'test-secret')
    ).toBe(false);
  });

  it('compares verify tokens safely', () => {
    expect(timingSafeStringEqual('abc', 'abc')).toBe(true);
    expect(timingSafeStringEqual('abc', 'abd')).toBe(false);
  });
});

describe('webhook extraction', () => {
  it('extracts text messages and ignores statuses', () => {
    const messages = extractInboundTextMessages({
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ wa_id: '32470000001', user_id: 'BE.ABC' }],
                messages: [
                  {
                    from: '32470000001',
                    id: 'wamid.1',
                    timestamp: '1',
                    type: 'text',
                    text: { body: 'What is revenue?' },
                    from_user_id: 'BE.ABC',
                  },
                  {
                    from: '32470000001',
                    id: 'wamid.2',
                    timestamp: '2',
                    type: 'image',
                  },
                ],
                statuses: [{ id: 'x', status: 'delivered' }],
              },
            },
          ],
        },
      ],
    });
    expect(messages).toHaveLength(1);
    expect(messages[0]?.text).toBe('What is revenue?');
    expect(messages[0]?.fromUserId).toBe('BE.ABC');
  });
});

describe('formatting', () => {
  it('converts markdown bold', () => {
    expect(markdownToWhatsApp('**hello**')).toBe('*hello*');
  });

  it('does not double-wrap bold headings', () => {
    expect(markdownToWhatsApp('## **Revenue**')).toBe('*Revenue*');
    expect(markdownToWhatsApp('### Top customers')).toBe('*Top customers*');
  });

  it('collapses leftover double asterisks', () => {
    expect(markdownToWhatsApp('****hello****')).toBe('*hello*');
  });

  it('leaves whatsapp bold alone', () => {
    expect(markdownToWhatsApp('*hello*')).toBe('*hello*');
  });

  it('splits long text under 4096', () => {
    const long = Array.from({ length: 50 }, (_, i) => `Paragraph ${i}. ${'x'.repeat(100)}`).join(
      '\n\n'
    );
    const chunks = splitWhatsAppText(long, 500);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 500)).toBe(true);
  });
});

describe('allowlist', () => {
  it('resolves E.164 identities to personas', () => {
    const allowlist = new Allowlist({
      identities: { '+32470000001': 'persona-a' },
      personas: {
        'persona-a': {
          username: 'whatsapp-demo-persona-a',
          name: 'Demo Persona A',
          email: 'persona-a@example.com',
          suborganization: 'tenant-a',
          tenantValue: 'tenant-a',
        },
      },
    });
    expect(normalizeIdentityKey('32470000001')).toBe('+32470000001');
    expect(allowlist.resolve('32470000001')?.persona.tenantValue).toBe(
      'tenant-a'
    );
    expect(allowlist.resolve('+19999999999')).toBeNull();
  });
});

describe('off-topic guard', () => {
  it('flags general-purpose prompts', () => {
    expect(looksOffTopic('Write me a poem about cats')).toBe(true);
    expect(looksOffTopic('What is total revenue?')).toBe(false);
    expect(looksOffTopic('/reset')).toBe(false);
  });
});
