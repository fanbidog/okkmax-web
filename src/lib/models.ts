/** 拉中转站某分组支持的模型 id 列表(OpenAI 式 /v1/models)。失败返回 []。 */
export async function fetchModels(baseUrl: string, apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(`${baseUrl}/v1/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: Array<{ id?: string }> };
    return (data.data ?? []).map((m) => m.id).filter((x): x is string => typeof x === "string").sort();
  } catch {
    return [];
  }
}
