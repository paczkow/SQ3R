import type { Question, SurveyResponse } from "./schemas";

export type ChapterResult = {
  title: string;
  surveyTitle: string;
  overview: string;
  readingFocus: SurveyResponse["readingFocus"];
  questions: Question[];
};

export function render(
  articleTitle: string,
  chapters: ChapterResult[],
): string {
  const lines: string[] = [`# ${articleTitle}`, ""];

  for (const chapter of chapters) {
    lines.push(`## ${chapter.title}`, "");

    lines.push(`> [!summary]`, `> ${chapter.overview}`, "");

    if (chapter.readingFocus.length > 0) {
      lines.push(
        `> [!tip] Reading focus`,
        `> *What to pay attention to while reading:*`,
      );
      for (const focus of chapter.readingFocus) {
        lines.push(`> - ${focus.directive}`);
      }
      lines.push("");
    }

    for (const q of chapter.questions) {
      lines.push(`> [!question] ${q.question}`, `> ${q.expectedAnswer}`, "");
    }
  }

  return lines.join("\n");
}
