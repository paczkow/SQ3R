export interface JsonSchema {
	name: string;
	schema: object;
}

export interface LLMClient {
	complete(
		systemPrompt: string,
		userMessage: string,
		jsonSchema: JsonSchema,
	): Promise<string>;
}
