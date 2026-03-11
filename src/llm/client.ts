import type { JsonSchema, LLMClient } from "./types";

export class ChatCompletionsClient implements LLMClient {
  constructor(
    private baseUrl: string,
    private apiKey: string,
    private model: string,
  ) {}

  async complete(
    systemPrompt: string,
    userMessage: string,
    jsonSchema: JsonSchema,
  ): Promise<string> {
    const url = `${this.baseUrl.replace(/\/+$/, "")}/chat/completions`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: jsonSchema.name,
            strict: true,
            schema: jsonSchema.schema,
          },
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`LLM API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const content = data.choices[0]?.message.content;
    if (content === undefined) throw new Error("No content in response");

    try {
      const wrapper = JSON.parse(content) as Record<string, unknown>;
      if (
        "completion" in wrapper &&
        typeof wrapper.completion === "string" &&
        wrapper.completion !== ""
      ) {
        return wrapper.completion;
      }
      if ("completion" in wrapper && !wrapper.completion) {
        throw new Error(
          `Model returned empty completion — reasoning leaked into response. Raw content: ${content.slice(0, 200)}`,
        );
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        // content is not JSON at all — pass through and let caller handle it
      } else {
        throw e;
      }
    }

    return content;
  }
}
