import { z } from "zod";

export const PhaseSchema = z.enum(["discovery", "deep_dive"]);

export const PrerequisiteSchema = z.object({
	concept: z.string(),
	whyNeeded: z.string(),
});

export const ConceptSchema = z.object({
	id: z.string(),
	surfaceForm: z.string(),
	category: z.enum([
		"claim",
		"definition",
		"term",
		"entity",
		"reference",
		"result",
		"method",
		"metric",
		"resource",
	]),
	level: z.enum(["core", "supporting", "detail"]),
	semanticHandle: z.string(),
	context: z.string(),
	targetRelevance: z.string(),
	targetRelevanceScore: z.number(),
	foundationScore: z.number().nullable(),
	practicalAnchor: z.string(),
});

export const RelationshipSchema = z.object({
	from: z.string(),
	to: z.string(),
	type: z.enum([
		"enables",
		"requires",
		"contrasts",
		"exemplifies",
		"constrains",
		"part-of",
		"leads-to",
		"specializes",
	]),
	explanation: z.string(),
});

export const SurveyResponseSchema = z.object({
	title: z.string(),
	overview: z.string(),
	phase: PhaseSchema,
	target: z.string(),
	prerequisites: z.array(PrerequisiteSchema),
	concepts: z.array(ConceptSchema),
	readingFocus: z.array(
		z.object({
			directive: z.string(),
			conceptIds: z.array(z.string()),
		}),
	),
	relationships: z.array(RelationshipSchema),
});

export const QuestionSchema = z.object({
	id: z.string(),
	conceptId: z.union([z.string(), z.array(z.string())]),
	surfaceForm: z.string(),
	type: z.enum([
		"recall",
		"mechanism",
		"application",
		"trade-off",
		"diagnostic",
	]),
	question: z.string(),
	expectedAnswer: z.string(),
	whyRelevant: z.string(),
	relevanceScore: z.number(),
	commonMisconception: z.string().optional(),
	correction: z.string().optional(),
});

export const QuestionsResponseSchema = z.object({
	title: z.string(),
	overview: z.string(),
	phase: PhaseSchema,
	target: z.string(),
	totalConceptsSurveyed: z.number(),
	questions: z.array(QuestionSchema),
});

export type Phase = z.infer<typeof PhaseSchema>;
export type Prerequisite = z.infer<typeof PrerequisiteSchema>;
export type Concept = z.infer<typeof ConceptSchema>;
export type Relationship = z.infer<typeof RelationshipSchema>;
export type SurveyResponse = z.infer<typeof SurveyResponseSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type QuestionsResponse = z.infer<typeof QuestionsResponseSchema>;

export const surveyJsonSchema = z.toJSONSchema(SurveyResponseSchema);
export const questionsJsonSchema = z.toJSONSchema(QuestionsResponseSchema);
