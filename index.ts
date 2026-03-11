import * as readline from "node:readline";
import type { Phase } from "./src/schemas";
import { createLLMClient } from "./src/llm/index";
import { generateQuestions } from "./src/questions";
import { type ChapterResult, render } from "./src/render";
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
const llm = createLLMClient();

process.stderr.write(
  `\nProcessing ${chapters.length} chapter(s) in parallel…\n`,
);

const chapterResults = await Promise.all(
  chapters.map(async (chapter): Promise<ChapterResult> => {
    process.stderr.write(`  Starting: ${chapter.title}\n`);
    const survey = await surveyChapter(
      chapter,
      surveyPrompt,
      llm,
      phase,
      target,
    );
    const questions = await generateQuestions(survey, questionsPrompt, llm);
    process.stderr.write(`  Done:     ${chapter.title}\n`);
    return {
      title: chapter.title,
      surveyTitle: survey.title,
      overview: survey.overview,
      readingFocus: survey.readingFocus,
      questions,
    };
  }),
);

const articleTitle = chapterResults[0]?.title || "Unknown";

const output = render(articleTitle, chapterResults);
process.stdout.write(output);
