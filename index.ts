import * as readline from "node:readline";
import { buildConceptMap } from "./src/conceptMap";
import { createLLMClient } from "./src/llm/index";
import { generateQuestions } from "./src/questions";
import { type ChapterResult, render } from "./src/render";
import type { Phase } from "./src/schemas";
import { splitByChapters } from "./src/split";
import { surveyChapter } from "./src/survey";

const filePath = process.argv[2];
if (!filePath) {
	console.error("Usage: bun run index.ts <article.md>");
	process.exit(1);
}

function ask(rl: readline.Interface, question: string): Promise<string> {
	return new Promise((resolve) => rl.question(question, resolve));
}

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stderr,
});

const target = await ask(
	rl,
	"What is the purpose of reading this material?\n> ",
);

process.stderr.write(
	"\nReading phase:\n" +
		"  1. Discovery  — first encounter with the material. Extracts 8–12 core concepts,\n" +
		"                  maps how the big ideas relate, and primes you with reading focus\n" +
		"                  directives. After this pass you should be able to explain the\n" +
		"                  text's structure in 2 minutes.\n\n" +
		"  2. Deep dive  — assumes you have the scaffolding. Extracts 12–20 concepts focused\n" +
		"                  on mechanisms, trade-offs, edge cases, and failure modes. Questions\n" +
		"                  push toward working knowledge and decision-making.\n\n",
);
const phaseChoice = await ask(rl, "Select phase [1/2]: ");
rl.close();

const phase: Phase = phaseChoice.trim() === "2" ? "deep_dive" : "discovery";

const markdown = await Bun.file(filePath).text();
const chapters = splitByChapters(markdown);

if (chapters.length === 0) {
	console.error("No ## chapters found in the article.");
	process.exit(1);
}

const surveyPrompt = await Bun.file("src/prompts/survey.md").text();
const questionsPrompt = await Bun.file("src/prompts/questions.md").text();
const conceptMapPrompt = await Bun.file("src/prompts/conceptMap.md").text();
const llm = createLLMClient();

// Phase 1: Survey all chapters in parallel
process.stderr.write(
	`\nPhase 1: Surveying ${chapters.length} chapter(s) in parallel…\n`,
);

const surveys = await Promise.all(
	chapters.map((chapter) => {
		process.stderr.write(`  Surveying: ${chapter.title}\n`);
		return surveyChapter(chapter, surveyPrompt, llm, phase, target);
	}),
);

process.stderr.write("\nPhase 2: Questions + concept map in parallel…\n");

// Phase 2: Questions + concept map in parallel
const [questionSets, conceptMap] = await Promise.all([
	Promise.all(
		surveys.map((survey) => generateQuestions(survey, questionsPrompt, llm)),
	),
	buildConceptMap(
		surveys,
		chapters.map((c) => c.title),
		llm,
		conceptMapPrompt,
	),
]);

const chapterResults: ChapterResult[] = chapters.map((ch, i) => {
	const survey = surveys[i];
	const questions = questionSets[i];
	if (!survey || !questions) {
		throw new Error(
			`Missing survey or questions for chapter ${i}: ${ch.title}`,
		);
	}
	return {
		title: ch.title,
		surveyTitle: survey.title,
		overview: survey.overview,
		readingFocus: survey.readingFocus,
		questions,
	};
});

const articleTitle = chapterResults[0]?.title || "Unknown";

const output = render(articleTitle, chapterResults, conceptMap);
process.stdout.write(output);
