export type ProgressStatus = 'pending' | 'inProgress' | 'success' | 'error';

export interface ProgressTreeNode {
  id: string;
  step: string;
  status: ProgressStatus;
  children?: ProgressTreeNode[];
  description?: string;
  descriptionMetadata?: Record<string, unknown>;
}

export interface AIPromptStartMessage {
  start: true;
  conversationId: string;
}

export interface AIPromptProgressMessage {
  progress: ProgressTreeNode;
  conversationId?: string;
}

export interface AIPromptTextDeltaMessage {
  textDelta: string;
}

export interface AIPromptFinishMessage {
  finish: true;
  conversationId?: string;
  result: AIPromptResult | null;
}

export interface AIPromptErrorMessage {
  error: string;
}

export type AIPromptStreamMessage =
  | AIPromptStartMessage
  | AIPromptProgressMessage
  | AIPromptTextDeltaMessage
  | AIPromptFinishMessage
  | AIPromptErrorMessage;

export interface AIMessageAsset {
  id?: string;
  message_id?: string;
  type: 'item' | string;
  value?: ItemConfig;
}

export interface AIMessage {
  id?: string;
  conversation_id?: string;
  message?: string;
  role?: string;
  agent?: string;
  task?: string;
  aiMessageAssets?: AIMessageAsset[];
}

export interface AIPromptResult {
  conversation_id?: string;
  user_message?: AIMessage;
  assistant_message?: AIMessage;
}

export interface ItemConfig {
  type: string;
  slots: unknown[];
  filters?: unknown[];
  options: Record<string, unknown>;
  title?: Record<string, string>;
}

export interface EmbedCredentials {
  luzmoKey: string;
  luzmoToken: string;
}
