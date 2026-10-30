import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type DocHit = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  path: string;
};

function docsRoot() {
  return path.join(process.cwd(), "content", "docs");
}

function titleFromMarkdown(markdown: string, fallback: string) {
  const heading = markdown.match(/^#\s+(.+)$/m);
  return heading?.[1]?.trim() || fallback;
}

function scoreDoc(question: string, title: string, body: string) {
  const terms = question
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2);
  if (terms.length === 0) return 0;
  const haystack = `${title}\n${body}`.toLowerCase();
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

export async function searchMarkdownFiles(question: string): Promise<{
  found: boolean;
  results: DocHit[];
}> {
  const directory = docsRoot();
  const files = (await readdir(directory)).filter((file) => file.endsWith(".md"));
  const scored: Array<DocHit & { score: number }> = [];

  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    const body = await readFile(path.join(directory, file), "utf8");
    const title = titleFromMarkdown(body, slug);
    const score = scoreDoc(question, title, body);
    if (score === 0) continue;
    const excerpt = body
      .replace(/^#.*$/m, "")
      .trim()
      .slice(0, 420);
    scored.push({
      title,
      slug,
      excerpt,
      body,
      path: `/docs/${slug}`,
      score,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const results = scored.slice(0, 3).map(({ score: _score, ...hit }) => {
    void _score;
    return hit;
  });

  return { found: results.length > 0, results };
}
