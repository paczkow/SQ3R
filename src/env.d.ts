declare module "bun" {
	interface Env {
		LLM_BASE_URL: string;
		LLM_API_KEY: string;
		LLM_MODEL: string;
	}
}
