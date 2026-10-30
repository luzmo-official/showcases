import Luzmo from "@luzmo/nodejs-sdk";
import {
  liveLuzmo,
  luzmoApiHost,
  luzmoAppServer,
  luzmoAuthKey,
  luzmoAuthToken,
  luzmoDatasetIds,
} from "@/lib/env";
import type { EmbedCredentials } from "@/lib/types";

export async function mintEmbedCredentials(
  chartDatasetIds: string[] = []
): Promise<EmbedCredentials | null> {
  if (!liveLuzmo()) return null;
  const apiKey = luzmoAuthKey();
  const apiToken = luzmoAuthToken();
  const datasetIds = [...new Set([...luzmoDatasetIds(), ...chartDatasetIds])];
  if (!apiKey || !apiToken || datasetIds.length === 0) return null;

  try {
    const client = new Luzmo({
      api_key: apiKey,
      api_token: apiToken,
      host: luzmoApiHost(),
    });
    const auth = await client.create("authorization", {
      type: "embed",
      username: "usr_avery",
      name: "Avery Chen",
      email: "avery.chen@example.com",
      access: {
        datasets: datasetIds.map((id) => ({ id, rights: "use" })),
      },
    });
    const id = auth?.id ?? auth?.data?.id;
    const token = auth?.token ?? auth?.data?.token;
    if (!id || !token) return null;
    return {
      authKey: id,
      authToken: token,
      apiHost: "/",
      appServer: luzmoAppServer(),
    };
  } catch (error) {
    console.error("[embed-debug] mint failed", error);
    return null;
  }
}
