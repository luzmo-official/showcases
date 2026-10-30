const previousResponseIds = new Map<string, string>();
const authorizedAccountIds = new Map<string, Set<string>>();

export function getPreviousResponseId(conversationId: string) {
  return previousResponseIds.get(conversationId);
}

export function setPreviousResponseId(conversationId: string, responseId: string) {
  previousResponseIds.set(conversationId, responseId);
}

export function rememberAccountIds(conversationId: string, ids: string[]) {
  const existing = authorizedAccountIds.get(conversationId) ?? new Set<string>();
  for (const id of ids) existing.add(id);
  authorizedAccountIds.set(conversationId, existing);
}

export function getRememberedAccountIds(conversationId: string) {
  return Array.from(authorizedAccountIds.get(conversationId) ?? []);
}
