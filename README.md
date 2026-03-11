# SQ3R Learning Tool

An AI-powered implementation of the SQ3R (Survey, Question, Read, Recite, Review) active reading method. Automatically extracts key concepts from learning materials and generates targeted study questions calibrated to your learning phase and goals.

## Features

- **Phase-aware extraction**: Discovery mode (8-12 core concepts) for first reads, Deep Dive mode (12-20 concepts) for detailed study
- **Target-driven**: Questions and concept extraction are filtered through your stated learning purpose
- **Reading focus directives**: Generates attention-priming statements to activate the pre-question effect
- **Relationship mapping**: Captures how concepts enable, require, contrast, or connect to each other
- **Obsidian-formatted output**: Questions as collapsible callouts, ready for spaced repetition

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Configure LLM provider

Copy the example environment file and fill in your API credentials:

```bash
cp .env.example .env
```

Edit `.env` with your values:

**Cloud providers:**

```bash
# OpenRouter
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=sk-or-v1-...
LLM_MODEL=google/gemini-2.0-flash-exp

# OpenAI
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=sk-proj-...
LLM_MODEL=gpt-4o
```

**Local LLMs:**

```bash
# LM Studio (https://lmstudio.ai/docs/developer/core/server)
LLM_BASE_URL=http://localhost:1234/v1
LLM_API_KEY=not-needed
LLM_MODEL=llama-3.1-8b-instruct

# Ollama (https://ollama.ai/)
LLM_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=not-needed
LLM_MODEL=llama3.1:8b
```

The tool works with any OpenAI-compatible chat completions API that supports structured JSON output (`response_format` with `json_schema`). For local models, this typically requires Llama 3.1 or newer.

## Usage

```bash
bun run index.ts <article.md>
```

The tool will prompt you for:

1. **Target**: What is the purpose of reading this material?
   - Example: "I want to build a RAG system for documentation search"
   - Example: "I need to understand how vector databases work"

2. **Phase**: Discovery (first read) or Deep dive (detailed study)

Output is written to stdout as Obsidian-formatted markdown. Redirect to a file:

```bash
bun run index.ts article.md > output.md
```

## Input Format

The tool expects markdown articles with `##` headings to denote chapters:

```markdown
# Article Title

## Chapter 1

Content here...

## Chapter 2

More content...
```

Each `## Chapter` is processed in parallel for faster results.

## Output Format

```markdown
# Article Title

## Chapter Title

> [!summary]
> One-to-two sentence overview of the chapter.

> [!tip] Reading focus
> _What to pay attention to while reading:_
>
> - Notice how the author organises X
> - Track the distinction between Y and Z

> [!question] What does byte-pair encoding do?
> Splits words into subword units to handle rare vocabulary efficiently.

> [!question] How does self-attention determine relevance?
> By computing dot-product similarity between query and key vectors.
```

## Development

Format code with Biome:

```bash
bunx --bun @biomejs/biome format --write .
```

Build check:

```bash
bun build index.ts --outdir /tmp/build
```

---

Built with [Bun](https://bun.sh).
