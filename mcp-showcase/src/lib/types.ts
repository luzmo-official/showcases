export type ActivityStatus = "pending" | "complete" | "error";

export type ActivityStep = {
  id: string;
  label: string;
  explanation: string;
  status: ActivityStatus;
  source?: "docs" | "crm" | "luzmo" | "demo-analytics" | "system";
};

export type VisualizationItem = {
  type: string;
  slots?: unknown;
  options?: unknown;
  filters?: unknown;
};

export type EmbedCredentials = {
  authKey: string;
  authToken: string;
  apiHost: string;
  appServer: string;
};

export type AnalyticsPayload = {
  account_id?: string;
  account_name?: string;
  metric?: string;
  period?: string;
  change_percent?: number;
  summary?: string;
  recommended_follow_up?: string;
  series?: Array<{ week: string; value: number }>;
  visualization?: VisualizationItem | Record<string, unknown> | null;
  source: "luzmo" | "demo";
};

export type ChatCompletePayload = {
  conversationId: string;
  text: string;
  activity: ActivityStep[];
  analytics: AnalyticsPayload[];
  embed: EmbedCredentials | null;
  liveLuzmo: boolean;
  demoMode: boolean;
  openaiConfigured: boolean;
  confirmationRequired: boolean;
  forcedDemo: boolean;
  turnId: string;
};

export type SseEvent =
  | {
      type: "status";
      demoMode: boolean;
      liveLuzmo: boolean;
      openaiConfigured: boolean;
      turnId: string;
    }
  | { type: "activity"; step: ActivityStep }
  | { type: "complete"; payload: ChatCompletePayload }
  | { type: "error"; message: string; demoFallbackAvailable?: boolean };
