function read(name: string) {
  return process.env[name]?.trim() || "";
}

export function openaiConfigured() {
  return Boolean(read("OPENAI_API_KEY"));
}

export function openaiModel() {
  return read("OPENAI_MODEL") || "gpt-4.1";
}

export function luzmoApiHost() {
  return read("LUZMO_API_HOST") || "https://api.luzmo.com";
}

export function luzmoAppServer() {
  return read("LUZMO_APP_SERVER") || "https://app.luzmo.com";
}

export function luzmoMcpUrl() {
  const base = read("LUZMO_MCP_URL") || "https://api.luzmo.com/0.1.0/mcp";
  const agentId = read("LUZMO_AGENT_ID");
  if (!agentId) return base;
  try {
    const url = new URL(base);
    if (!url.searchParams.has("agentId")) url.searchParams.set("agentId", agentId);
    return url.toString();
  } catch {
    return base;
  }
}

export function luzmoAuthKey() {
  return read("LUZMO_AUTH_KEY");
}

export function luzmoAuthToken() {
  return read("LUZMO_AUTH_TOKEN");
}

export function luzmoDatasetIds(): string[] {
  return read("LUZMO_DATASET_IDS")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function luzmoConfigured() {
  if (read("LUZMO_MCP_AUTHORIZATION")) return true;
  return Boolean(luzmoAuthKey() && luzmoAuthToken());
}

export function demoMode() {
  return !luzmoConfigured();
}

export function liveLuzmo() {
  return luzmoConfigured();
}

export function mcpAuthorization(): string | undefined {
  const preset = read("LUZMO_MCP_AUTHORIZATION");
  if (preset) return preset;
  const key = luzmoAuthKey();
  const token = luzmoAuthToken();
  if (!key || !token) return undefined;
  return `Basic ${Buffer.from(`${key}:${token}`).toString("base64")}`;
}

export function mcpHeaders(): Record<string, string> | undefined {
  const key = luzmoAuthKey();
  const token = luzmoAuthToken();
  if (!key || !token) return undefined;
  return {
    authKey: key,
    authToken: token,
  };
}
