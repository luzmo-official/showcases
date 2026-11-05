import type { ActivityStep, ActivityStatus } from "@/lib/types";

export function createStep(
  id: string,
  label: string,
  explanation: string,
  status: ActivityStatus = "pending",
  source?: ActivityStep["source"]
): ActivityStep {
  return { id, label, explanation, status, source };
}

export const STEP_COPY = {
  classify: {
    label: "Classifying the user's intent",
    explanation: "Choosing among product documentation, account records, and analytics.",
  },
  docs: {
    label: "Consulting product documentation",
    explanation: "Documentation selected: this is a product how-to question.",
  },
  crm: {
    label: "Looking up account context",
    explanation: "Account Data selected: this question requires account-specific information.",
  },
  luzmo: {
    label: "Requesting analytics from Luzmo",
    explanation: "Luzmo selected: this question requires analysis of product-usage data.",
  },
  combined: {
    label: "Combining account context with analytics",
    explanation: "Account Data + Luzmo selected: the request combines account context with analytics.",
  },
  demoAnalytics: {
    label: "Using representative demo analytics",
    explanation: "Demo mode: returning representative usage results, not a live Luzmo query.",
  },
  receive: {
    label: "Receiving an analysis or visualization",
    explanation: "A data-backed result is available for the authorized accounts.",
  },
  prepare: {
    label: "Preparing the final answer",
    explanation: "Combining tool results into a single response.",
  },
} as const;
