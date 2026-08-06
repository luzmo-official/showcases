import type {
  AIPromptRequestParams,
  AIPromptStreamMessage,
  AIPromptResult,
  ItemConfig,
  ProgressTreeNode,
  ProgressStatus,
} from './types.js';

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isProgressMessage(
  msg: AIPromptStreamMessage
): msg is { progress: ProgressTreeNode; conversationId?: string } {
  return 'progress' in msg;
}

export function isTextDeltaMessage(
  msg: AIPromptStreamMessage
): msg is { textDelta: string } {
  return 'textDelta' in msg;
}

export function isFinishMessage(
  msg: AIPromptStreamMessage
): msg is { finish: true; conversationId?: string; result: AIPromptResult | null } {
  return 'finish' in msg;
}

export function isErrorMessage(
  msg: AIPromptStreamMessage
): msg is { error: string } {
  return 'error' in msg;
}

export function isStartMessage(
  msg: AIPromptStreamMessage
): msg is { start: true; conversationId: string } {
  return 'start' in msg;
}

// ---------------------------------------------------------------------------
// Request builder
// ---------------------------------------------------------------------------

export function buildAIPromptProperties(
  question: string,
  datasetIds: string[],
  conversationId?: string
): Record<string, unknown> {
  const input: Array<Record<string, unknown>> = [
    { type: 'text', text: question },
    ...datasetIds.map((id) => ({ type: 'dataset', id })),
  ];

  return {
    agent: 'analyst',
    task: 'generate',
    stream: true,
    response_mode: 'mixed',
    text_format: 'markdown',
    locale_id: 'en',
    timezone_id: 'UTC',
    ...(conversationId ? { conversation_id: conversationId } : {}),
    input,
  };
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

export function extractTextFromResult(result: AIPromptResult | null): string {
  return result?.assistant_message?.message?.trim() ?? '';
}

export function extractItemFromResult(
  result: AIPromptResult | null
): ItemConfig | undefined {
  const assets = result?.assistant_message?.aiMessageAssets ?? [];
  const itemAsset = assets.find((a) => a.type === 'item' && a.value);
  return itemAsset?.value as ItemConfig | undefined;
}

function normalizeProgressNode(raw: Record<string, unknown>): ProgressTreeNode {
  const children = Array.isArray(raw.children)
    ? (raw.children as Record<string, unknown>[]).map(normalizeProgressNode)
    : undefined;

  const descriptionMetadata =
    (raw.description_metadata as Record<string, unknown> | undefined) ??
    (raw.descriptionMetadata as Record<string, unknown> | undefined);

  return {
    id: String(raw.id ?? ''),
    step: String(raw.step ?? ''),
    status: (raw.status as ProgressStatus) ?? 'pending',
    ...(raw.description != null ? { description: String(raw.description) } : {}),
    ...(descriptionMetadata ? { descriptionMetadata } : {}),
    ...(children?.length ? { children } : {}),
  };
}

function mapStreamEvent(raw: Record<string, unknown>): AIPromptStreamMessage | null {
  const type = raw.type as string | undefined;
  const conversationId =
    typeof raw.conversation_id === 'string' ? raw.conversation_id : undefined;

  switch (type) {
    case 'start':
      if (!conversationId) return null;
      return { start: true, conversationId };

    case 'progress': {
      const progressRaw = raw.progress;
      if (!progressRaw || typeof progressRaw !== 'object') return null;
      return {
        progress: normalizeProgressNode(progressRaw as Record<string, unknown>),
        conversationId,
      };
    }

    case 'text_delta': {
      const delta = raw.delta;
      if (typeof delta !== 'string' || !delta) return null;
      return { textDelta: delta };
    }

    case 'finish':
      return {
        finish: true,
        conversationId,
        result: (raw.result as AIPromptResult | null) ?? null,
      };

    case 'error': {
      const errorText =
        typeof raw.error_text === 'string'
          ? raw.error_text
          : 'An unknown error occurred';
      return { error: errorText };
    }

    default:
      return null;
  }
}

function parseSSEPayload(payload: string): AIPromptStreamMessage | 'done' | null {
  const trimmed = payload.trim();
  if (!trimmed || trimmed === '[DONE]') {
    return trimmed === '[DONE]' ? 'done' : null;
  }

  try {
    const raw = JSON.parse(trimmed) as Record<string, unknown>;
    return mapStreamEvent(raw);
  } catch {
    return null;
  }
}

/**
 * Streams a Luzmo /AIPrompt analyst request and yields normalized messages.
 * @see https://developer.luzmo.com/api/createAIPrompt.md
 */
export async function* streamAIPrompt(
  params: AIPromptRequestParams
): AsyncGenerator<AIPromptStreamMessage> {
  const host = params.luzmoHost.replace(/\/$/, '');
  const url = `${host}/0.1.0/aiprompt`;

  const body = {
    action: 'create',
    version: '0.1.0',
    key: params.luzmoKey,
    token: params.luzmoToken,
    properties: buildAIPromptProperties(
      params.question,
      params.datasetIds,
      params.conversationId
    ),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`AIPrompt API returned ${response.status}: ${errorText}`);
  }

  if (!response.body) {
    throw new Error('AIPrompt API returned no response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';

      for (const frame of frames) {
        const dataLines = frame
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => (line.startsWith('data: ') ? line.slice(6) : line.slice(5)));

        if (dataLines.length === 0) continue;

        const payload = dataLines.join('\n');
        const parsed = parseSSEPayload(payload);

        if (parsed === 'done') return;
        if (parsed) yield parsed;
      }
    }

    if (buffer.trim()) {
      const dataLines = buffer
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => (line.startsWith('data: ') ? line.slice(6) : line.slice(5)));

      if (dataLines.length > 0) {
        const parsed = parseSSEPayload(dataLines.join('\n'));
        if (parsed === 'done') return;
        if (parsed) yield parsed;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
