/**
 * Converts basic Markdown bold markers to Slack mrkdwn.
 * Applies only to text sent to Slack — not to AIPrompt payloads.
 *
 * Protected: fenced ```code``` and `inline` code are left untouched.
 */
export function markdownToSlackMrkdwn(text: string): string {
  if (!text || !text.includes('**')) return text;

  const placeholders: string[] = [];
  const stash = (match: string): string => {
    const index = placeholders.length;
    placeholders.push(match);
    return `\u0000CODE${index}\u0000`;
  };

  let out = text
    // Fenced code blocks (``` ... ```)
    .replace(/```[\s\S]*?```/g, stash)
    // Inline code (`...`)
    .replace(/`[^`\n]+`/g, stash);

  // Markdown bold → Slack bold
  out = out.replace(/\*\*(.+?)\*\*/g, '*$1*');

  return out.replace(/\u0000CODE(\d+)\u0000/g, (_m, i) => placeholders[Number(i)] ?? '');
}
