import type { LLMClient } from "./llm/types";
import type { ConceptMapResponse, Relationship } from "./schemas";
import { conceptMapJsonSchema } from "./schemas";
import type { SurveyResult } from "./survey";

interface ChapterInput {
	chapterTitle: string;
	concepts: {
		id: string;
		surfaceForm: string;
		semanticHandle: string;
		level: string;
	}[];
	relationships: {
		from: string;
		to: string;
		type: string;
		explanation: string;
	}[];
}

interface UnifiedConcept {
	id: string;
	surfaceForm: string;
	level: string;
	chapter: string;
	targetRelevanceScore: number;
}

interface UnifiedGraph {
	concepts: UnifiedConcept[];
	relationships: { from: string; to: string; type: string }[];
	chapters: string[];
}

export function prepareInput(
	surveys: SurveyResult[],
	chapterTitles: string[],
): { chapters: ChapterInput[]; prefixedSurveys: SurveyResult[] } {
	if (surveys.length !== chapterTitles.length) {
		throw new Error(
			`surveys.length (${surveys.length}) must match chapterTitles.length (${chapterTitles.length})`,
		);
	}

	const prefixedSurveys = surveys.map((survey, i) => {
		const prefix = `ch${i}-`;
		return {
			...survey,
			concepts: survey.concepts.map((c) => ({ ...c, id: `${prefix}${c.id}` })),
			relationships: survey.relationships.map((r) => ({
				...r,
				from: `${prefix}${r.from}`,
				to: `${prefix}${r.to}`,
			})),
		};
	});

	const chapters: ChapterInput[] = prefixedSurveys.map((survey, i) => ({
		chapterTitle: chapterTitles[i] as string,
		concepts: survey.concepts.map((c) => ({
			id: c.id,
			surfaceForm: c.surfaceForm,
			semanticHandle: c.semanticHandle,
			level: c.level,
		})),
		relationships: survey.relationships.map((r) => ({
			from: r.from,
			to: r.to,
			type: r.type,
			explanation: r.explanation,
		})),
	}));

	return { chapters, prefixedSurveys };
}

export function applyMerges(
	prefixedSurveys: SurveyResult[],
	chapterTitles: string[],
	mergeGroups: ConceptMapResponse["mergeGroups"],
	crossChapterRelationships: Relationship[],
): UnifiedGraph {
	// Build merge map: mergedId -> canonicalId
	const mergeMap = new Map<string, string>();
	const canonicalSurface = new Map<string, string>();
	for (const group of mergeGroups) {
		canonicalSurface.set(group.canonicalId, group.canonicalSurfaceForm);
		for (const id of group.mergedIds) {
			mergeMap.set(id, group.canonicalId);
		}
	}

	const resolve = (id: string) => mergeMap.get(id) ?? id;

	// Collect all concepts, skipping merged ones
	const seen = new Set<string>();
	const concepts: UnifiedConcept[] = [];

	for (let i = 0; i < prefixedSurveys.length; i++) {
		const survey = prefixedSurveys[i];
		if (!survey) continue;
		for (const c of survey.concepts) {
			const resolvedId = resolve(c.id);
			if (seen.has(resolvedId)) continue;
			seen.add(resolvedId);
			const chapterTitle = chapterTitles[i];
			if (!chapterTitle) continue;
			concepts.push({
				id: resolvedId,
				surfaceForm: canonicalSurface.get(resolvedId) ?? c.surfaceForm,
				level: c.level,
				chapter: chapterTitle,
				targetRelevanceScore: c.targetRelevanceScore,
			});
		}
	}

	// For merged concepts, pick the chapter with highest targetRelevanceScore
	for (const group of mergeGroups) {
		const allIds = [group.canonicalId, ...group.mergedIds];
		let bestScore = -1;
		let bestChapter = "";
		for (let i = 0; i < prefixedSurveys.length; i++) {
			const survey = prefixedSurveys[i];
			const chapterTitle = chapterTitles[i];
			if (!survey || !chapterTitle) continue;
			for (const c of survey.concepts) {
				if (allIds.includes(c.id) && c.targetRelevanceScore > bestScore) {
					bestScore = c.targetRelevanceScore;
					bestChapter = chapterTitle;
				}
			}
		}
		const concept = concepts.find((c) => c.id === group.canonicalId);
		if (concept && bestChapter) {
			concept.chapter = bestChapter;
		}
	}

	// Collect relationships, resolving IDs and deduplicating
	const relSet = new Set<string>();
	const relationships: { from: string; to: string; type: string }[] = [];

	const addRel = (from: string, to: string, type: string) => {
		const resolvedFrom = resolve(from);
		const resolvedTo = resolve(to);
		if (resolvedFrom === resolvedTo) return;
		const key = `${resolvedFrom}->${resolvedTo}:${type}`;
		if (relSet.has(key)) return;
		relSet.add(key);
		relationships.push({ from: resolvedFrom, to: resolvedTo, type });
	};

	for (const survey of prefixedSurveys) {
		for (const r of survey.relationships) {
			addRel(r.from, r.to, r.type);
		}
	}
	for (const r of crossChapterRelationships) {
		addRel(r.from, r.to, r.type);
	}

	return { concepts, relationships, chapters: chapterTitles };
}

export function renderMermaid(graph: UnifiedGraph): string {
	const lines: string[] = ["graph TD"];

	// Group concepts by chapter
	const byChapter = new Map<string, UnifiedConcept[]>();
	for (const ch of graph.chapters) {
		byChapter.set(ch, []);
	}
	for (const c of graph.concepts) {
		const list = byChapter.get(c.chapter);
		if (list) list.push(c);
	}

	// Assign short IDs for mermaid
	const shortId = new Map<string, string>();
	let counter = 1;
	for (const c of graph.concepts) {
		const sid = `g${String(counter).padStart(3, "0")}`;
		shortId.set(c.id, sid);
		counter++;
	}

	// Render subgraphs
	for (const [chapter, concepts] of byChapter) {
		if (concepts.length === 0) continue;
		lines.push(`  subgraph "${chapter}"`);
		for (const c of concepts) {
			const sid = shortId.get(c.id);
			if (!sid) continue;
			const label = c.surfaceForm.replace(/"/g, "'");
			lines.push(`    ${sid}["${label}"]`);
		}
		lines.push("  end");
	}

	// Render edges
	for (const r of graph.relationships) {
		const from = shortId.get(r.from);
		const to = shortId.get(r.to);
		if (from && to) {
			lines.push(`  ${from} -->|${r.type}| ${to}`);
		}
	}

	// Class definitions for levels
	lines.push("");
	lines.push("  classDef core fill:#4a9eff,color:#fff");
	lines.push("  classDef supporting fill:#7bc67e,color:#fff");
	lines.push("  classDef detail fill:#ccc,color:#333");

	const byLevel = {
		core: [] as string[],
		supporting: [] as string[],
		detail: [] as string[],
	};
	for (const c of graph.concepts) {
		const sid = shortId.get(c.id);
		if (!sid) continue;
		if (c.level in byLevel) {
			byLevel[c.level as keyof typeof byLevel].push(sid);
		}
	}
	for (const [level, ids] of Object.entries(byLevel)) {
		if (ids.length > 0) {
			lines.push(`  class ${ids.join(",")} ${level}`);
		}
	}

	return lines.join("\n");
}

export async function buildConceptMap(
	surveys: SurveyResult[],
	chapterTitles: string[],
	llm: LLMClient,
	systemPrompt: string,
): Promise<string> {
	const { chapters, prefixedSurveys } = prepareInput(surveys, chapterTitles);

	const userMessage = JSON.stringify({ chapters });
	const raw = await llm.complete(systemPrompt, userMessage, {
		name: "concept_map_response",
		schema: conceptMapJsonSchema,
	});
	const response = JSON.parse(raw) as ConceptMapResponse;

	const graph = applyMerges(
		prefixedSurveys,
		chapterTitles,
		response.mergeGroups,
		response.crossChapterRelationships,
	);

	return renderMermaid(graph);
}
