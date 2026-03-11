export type Chapter = { title: string; content: string };

export function splitByChapters(markdown: string): Chapter[] {
	const lines = markdown.split("\n");
	const chapters: Chapter[] = [];
	let currentTitle = "";
	let currentLines: string[] = [];
	let inChapter = false;

	for (const line of lines) {
		if (/^## /.test(line)) {
			if (inChapter) {
				chapters.push({
					title: currentTitle,
					content: currentLines.join("\n").trim(),
				});
			}
			currentTitle = line.replace(/^## /, "").trim();
			currentLines = [];
			inChapter = true;
		} else if (inChapter) {
			currentLines.push(line);
		}
	}

	if (inChapter) {
		chapters.push({
			title: currentTitle,
			content: currentLines.join("\n").trim(),
		});
	}

	return chapters;
}
