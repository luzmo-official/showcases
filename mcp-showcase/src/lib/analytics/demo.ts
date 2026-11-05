import {
  getAccessibleAccountIds,
  getAccountById,
  type PublicAccount,
} from "@/lib/crm/mock-accounts";

export type WeeklyPoint = {
  week: string;
  value: number;
};

export type DemoAnalyticsResult = {
  account_id: string;
  account_name: string;
  metric: string;
  period: string;
  change_percent: number;
  summary: string;
  recommended_follow_up: string;
  series: WeeklyPoint[];
  visualization: Record<string, never>;
  source: "demo";
};

const SERIES: Record<string, number[]> = {
  acc_northstar: [92, 88, 84, 79, 74, 71, 68, 61],
  acc_harbor: [70, 68, 63, 59, 54, 50, 47, 42],
  acc_brightline: [55, 57, 58, 60, 61, 63, 64, 66],
  acc_summit: [40, 41, 39, 42, 44, 43, 45, 46],
};

const SUMMARIES: Record<
  string,
  { summary: string; recommended_follow_up: string }
> = {
  acc_northstar: {
    summary:
      "Product adoption declined for five consecutive weeks, driven primarily by lower dashboard activity among editor users.",
    recommended_follow_up:
      "Review editor engagement with the customer before the renewal discussion.",
  },
  acc_harbor: {
    summary:
      "Weekly active editors fell steadily over eight weeks, with the steepest drop after week four.",
    recommended_follow_up:
      "Confirm whether the operations team completed onboarding for the new warehouse cohort.",
  },
  acc_brightline: {
    summary:
      "Adoption increased modestly over eight weeks, led by viewer traffic on shared reports.",
    recommended_follow_up:
      "Keep the expansion conversation focused on remaining unused editor seats.",
  },
  acc_summit: {
    summary:
      "Usage was roughly flat, with small week-to-week variation and no sustained decline.",
    recommended_follow_up:
      "No usage-based risk flagged ahead of the later renewal date.",
  },
};

function weeks(): string[] {
  return [
    "W1",
    "W2",
    "W3",
    "W4",
    "W5",
    "W6",
    "W7",
    "W8",
  ];
}

function toResult(account: PublicAccount): DemoAnalyticsResult | null {
  const values = SERIES[account.account_id];
  if (!values) return null;
  const first = values[0];
  const last = values[values.length - 1];
  const change_percent = Number((((last - first) / first) * 100).toFixed(1));
  const copy = SUMMARIES[account.account_id];
  return {
    account_id: account.account_id,
    account_name: account.account_name,
    metric: "Product adoption",
    period: "8 weeks",
    change_percent,
    summary: copy.summary,
    recommended_follow_up: copy.recommended_follow_up,
    series: weeks().map((week, index) => ({ week, value: values[index] })),
    visualization: {},
    source: "demo",
  };
}

export function getUsageAnalytics(accountIds: string[], userId: string) {
  const allowed = new Set(getAccessibleAccountIds(userId));
  const authorized = accountIds.filter((id) => allowed.has(id));
  if (authorized.length === 0) {
    return {
      found: false as const,
      error: "No analytics data matches the authorized account identifiers.",
      results: [] as DemoAnalyticsResult[],
    };
  }

  const results = authorized
    .map((id) => {
      const account = getAccountById(id, userId);
      return account ? toResult(account) : null;
    })
    .filter((item): item is DemoAnalyticsResult => item !== null);

  if (results.length === 0) {
    return {
      found: false as const,
      error: "No analytics data matches the authorized account identifiers.",
      results: [],
    };
  }

  return { found: true as const, results };
}

export function decliningAccounts(results: DemoAnalyticsResult[]) {
  return results.filter((item) => item.change_percent < 0);
}
