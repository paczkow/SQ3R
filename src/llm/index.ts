import { ChatCompletionsClient } from "./client";
import type { LLMClient } from "./types";

export function createLLMClient(): LLMClient {
	const baseUrl = process.env.LLM_BASE_URL;
	const apiKey = process.env.LLM_API_KEY;
	const model = process.env.LLM_MODEL;

	if (!baseUrl || !apiKey || !model) {
		console.error(
			"Missing environment variables: LLM_BASE_URL, LLM_API_KEY, LLM_MODEL",
		);
		process.exit(1);
	}

	return new ChatCompletionsClient(baseUrl, apiKey, model);
}
