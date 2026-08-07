/**
 * Convert common Markdown to WhatsApp-friendly formatting.
 * WhatsApp: *bold* _italic_ ~strike~ ```code```
 *
 * Must be idempotent: IQ sometimes mixes headings with **bold**, and
 * WhatsApp treats `**text**` as literal asterisks around bold text.
 */
export function markdownToWhatsApp(text: string): string {
  let out = text;

  // Fenced code blocks — normalize language tag away, keep content
  out = out.replace(/```[\w]*\n?([\s\S]*?)```/g, (_m, code: string) => {
    return '```' + code.trim() + '```';
  });

  // Headings before bold conversion (avoids ## **Title** → **Title**)
  out = out.replace(/^#{1,6}\s+(.+)$/gm, (_m, heading: string) => {
    return `*${stripEmphasis(heading)}*`;
  });

  // Bold **text** or __text__ -> *text*
  out = out.replace(/\*\*([^*]+)\*\*/g, '*$1*');
  out = out.replace(/__([^_]+)__/g, '*$1*');

  // Collapse any leftover double-asterisk wrappers (e.g. from mixed markup)
  out = out.replace(/\*{2,}([^*]+)\*{2,}/g, '*$1*');

  // Links [label](url) -> label (url)
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1 ($2)');

  return out.trim();
}

/** Strip markdown/WhatsApp emphasis markers from a heading title. */
function stripEmphasis(text: string): string {
  return text
    .replace(/\*{1,3}/g, '')
    .replace(/_{1,3}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const MAX_CHUNK = 4096;

/**
 * Split text into WhatsApp-safe chunks at paragraph boundaries.
 */
export function splitWhatsAppText(text: string, maxLen = MAX_CHUNK): string[] {
  const normalized = text.trim();
  if (!normalized) return [];
  if (normalized.length <= maxLen) return [normalized];

  const paragraphs = normalized.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = '';

  const pushCurrent = () => {
    if (current.trim()) chunks.push(current.trim());
    current = '';
  };

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para;
    if (candidate.length <= maxLen) {
      current = candidate;
      continue;
    }
    pushCurrent();
    if (para.length <= maxLen) {
      current = para;
      continue;
    }
    // Hard-split long paragraph by lines / words
    let remaining = para;
    while (remaining.length > maxLen) {
      let splitAt = remaining.lastIndexOf('\n', maxLen);
      if (splitAt < maxLen * 0.5) {
        splitAt = remaining.lastIndexOf(' ', maxLen);
      }
      if (splitAt < maxLen * 0.5) {
        splitAt = maxLen;
      }
      chunks.push(remaining.slice(0, splitAt).trim());
      remaining = remaining.slice(splitAt).trim();
    }
    current = remaining;
  }
  pushCurrent();
  return chunks;
}
