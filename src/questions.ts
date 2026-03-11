import type { LLMClient } from "./llm/types";
import {
	type Question,
	type QuestionsResponse,
	questionsJsonSchema,
} from "./schemas";
import type { SurveyResult } from "./survey";

export async function generateQuestions(
	surveyResult: SurveyResult,
	systemPrompt: string,
	llm: LLMClient,
): Promise<Question[]> {
	const raw = await llm.complete(systemPrompt, JSON.stringify(surveyResult), {
		name: "questions_response",
		schema: questionsJsonSchema,
	});
	const parsed = JSON.parse(raw) as QuestionsResponse;
	return parsed.questions.sort((a, b) => b.relevanceScore - a.relevanceScore);
}
