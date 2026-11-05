export const CURRENT_USER = {
  id: "usr_avery",
  name: "Avery Chen",
  email: "avery.chen@example.com",
} as const;

export type Account = {
  account_id: string;
  account_name: string;
  owner: string;
  owner_id: string;
  plan: string;
  renewal_date: string;
  segment: string;
  contract_status: string;
};

export const MOCK_ACCOUNTS: Account[] = [
  {
    account_id: "acc_northstar",
    account_name: "Northstar Health",
    owner: "Avery Chen",
    owner_id: CURRENT_USER.id,
    plan: "Enterprise",
    renewal_date: "2026-11-03",
    segment: "Enterprise",
    contract_status: "active",
  },
  {
    account_id: "acc_harbor",
    account_name: "Harbor Logistics",
    owner: "Avery Chen",
    owner_id: CURRENT_USER.id,
    plan: "Growth",
    renewal_date: "2026-10-15",
    segment: "Mid-market",
    contract_status: "active",
  },
  {
    account_id: "acc_brightline",
    account_name: "Brightline Education",
    owner: "Avery Chen",
    owner_id: CURRENT_USER.id,
    plan: "Enterprise",
    renewal_date: "2026-11-12",
    segment: "Enterprise",
    contract_status: "active",
  },
  {
    account_id: "acc_summit",
    account_name: "Summit Retail",
    owner: "Avery Chen",
    owner_id: CURRENT_USER.id,
    plan: "Growth",
    renewal_date: "2026-12-20",
    segment: "Mid-market",
    contract_status: "active",
  },
  {
    account_id: "acc_cascade",
    account_name: "Cascade Bank",
    owner: "Jordan Blake",
    owner_id: "usr_jordan",
    plan: "Enterprise",
    renewal_date: "2026-10-28",
    segment: "Enterprise",
    contract_status: "active",
  },
];

export type PublicAccount = Omit<Account, "owner_id">;

function publicAccount(account: Account): PublicAccount {
  const { owner_id: _ownerId, ...rest } = account;
  void _ownerId;
  return rest;
}

export function canAccessAccount(userId: string, accountId: string): boolean {
  const account = MOCK_ACCOUNTS.find((item) => item.account_id === accountId);
  return Boolean(account && account.owner_id === userId);
}

export function queryAccountData(
  userId: string,
  filters: {
    accountName?: string;
    renewingWithinDays?: number;
  }
) {
  const today = new Date("2026-09-22T00:00:00Z");
  const cutoff = new Date(today);
  cutoff.setUTCDate(
    cutoff.getUTCDate() + (filters.renewingWithinDays ?? 0)
  );
  const accountName = filters.accountName?.trim().toLowerCase();

  const accounts = MOCK_ACCOUNTS.filter((account) => {
    if (!canAccessAccount(userId, account.account_id)) return false;
    if (accountName && account.account_name.toLowerCase() !== accountName) {
      return false;
    }
    if (filters.renewingWithinDays !== undefined) {
      const renewal = new Date(`${account.renewal_date}T00:00:00Z`);
      if (renewal < today || renewal > cutoff) return false;
    }
    return true;
  }).map(publicAccount);

  return { found: accounts.length > 0, accounts };
}

export function getAccessibleAccountIds(userId: string): string[] {
  return MOCK_ACCOUNTS.filter((account) =>
    canAccessAccount(userId, account.account_id)
  ).map((account) => account.account_id);
}

export function getAccountById(accountId: string, userId: string) {
  const account = MOCK_ACCOUNTS.find((item) => item.account_id === accountId);
  if (!account || !canAccessAccount(userId, account.account_id)) return null;
  return publicAccount(account);
}
