import type { LLMClient } from "./llm/types";
import { removeMedia } from "./sanitize";
import { type SurveyResponse, type Phase, surveyJsonSchema } from "./schemas";
import type { Chapter } from "./split";

export type SurveyResult = SurveyResponse;

export async function surveyChapter(
	chapter: Chapter,
	systemPrompt: string,
	llm: LLMClient,
	phase: Phase,
	target: string,
): Promise<SurveyResult> {
	console.log(`Requesting survey for: ${chapter.title}`);
	const userMessage = JSON.stringify({
		sourceText: removeMedia(chapter.content),
		phase,
		target,
	});
	const raw = await llm.complete(systemPrompt, userMessage, {
		name: "survey_response",
		schema: surveyJsonSchema,
	});
	return JSON.parse(raw) as SurveyResult;
}
