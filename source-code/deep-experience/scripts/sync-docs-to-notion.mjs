#!/usr/bin/env node
/**
 * Sync docs/*.md files to Notion database as pages.
 *
 * Usage:
 *   NOTION_TOKEN=ntn_xxx node scripts/sync-docs-to-notion.mjs
 *
 * Env:
 *   NOTION_TOKEN  — Notion integration token
 *   NOTION_DB_ID  — Target database ID (default: Documents DB)
 */

import { readFileSync, readdirSync } from "fs";
import { join, basename } from "path";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DB_ID =
  process.env.NOTION_DB_ID || "30b64986-0560-8037-8fb9-fdffd8cc931c";
const DOCS_DIR = new URL("../docs", import.meta.url).pathname;
const API = "https://api.notion.com/v1";

if (!NOTION_TOKEN) {
  console.error("Error: NOTION_TOKEN env var is required");
  process.exit(1);
}

// ─── Notion API helpers ───

async function notionFetch(path, method = "GET", body = null) {
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `Notion API ${res.status}: ${data.message || JSON.stringify(data)}`
    );
  }
  return data;
}

async function queryDatabase() {
  return notionFetch(`/databases/${DB_ID}/query`, "POST", {});
}

async function createPage(title, children) {
  return notionFetch("/pages", "POST", {
    parent: { database_id: DB_ID },
    properties: {
      ページ: {
        title: [{ text: { content: title } }],
      },
    },
    children: children.slice(0, 100),
  });
}

async function appendChildren(pageId, children) {
  return notionFetch(`/blocks/${pageId}/children`, "PATCH", { children });
}

async function archivePage(pageId) {
  return notionFetch(`/pages/${pageId}`, "PATCH", { archived: true });
}

// ─── Markdown → Notion Blocks ───

function richText(text) {
  if (!text) return [];
  const segments = [];
  // Process inline formatting: bold, italic, code, links
  const regex =
    /(\*\*(.+?)\*\*)|(`([^`]+?)`)|(\[([^\]]+)\]\(([^)]+)\))|(\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    // Text before this match
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        text: { content: text.slice(lastIndex, match.index) },
      });
    }
    if (match[1]) {
      // **bold**
      segments.push({
        type: "text",
        text: { content: match[2] },
        annotations: { bold: true },
      });
    } else if (match[3]) {
      // `code`
      segments.push({
        type: "text",
        text: { content: match[4] },
        annotations: { code: true },
      });
    } else if (match[5]) {
      // [link](url)
      segments.push({
        type: "text",
        text: { content: match[6], link: { url: match[7] } },
      });
    } else if (match[8]) {
      // *italic*
      segments.push({
        type: "text",
        text: { content: match[9] },
        annotations: { italic: true },
      });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({
      type: "text",
      text: { content: text.slice(lastIndex) },
    });
  }
  if (segments.length === 0) {
    segments.push({ type: "text", text: { content: text } });
  }
  return segments;
}

function parseMarkdownToBlocks(md) {
  const lines = md.split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty line → skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+\s*$/.test(line.trim())) {
      blocks.push({ object: "block", type: "divider", divider: {} });
      i++;
      continue;
    }

    // Code block
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim() || "plain text";
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      const content = codeLines.join("\n");
      // Notion max rich_text content is 2000 chars per segment
      if (content.length > 0) {
        // Map language names to Notion-supported ones
        const langMap = {
          mermaid: "mermaid",
          typescript: "typescript",
          json: "json",
          bash: "bash",
          sh: "bash",
          sql: "sql",
          html: "html",
          css: "css",
          javascript: "javascript",
          js: "javascript",
          ts: "typescript",
          tsx: "typescript",
          jsx: "javascript",
          "plain text": "plain text",
        };
        const notionLang = langMap[lang.toLowerCase()] || "plain text";
        blocks.push({
          object: "block",
          type: "code",
          code: {
            rich_text: splitLongText(content),
            language: notionLang,
          },
        });
      }
      continue;
    }

    // Headings
    const h1Match = line.match(/^# (.+)/);
    if (h1Match) {
      blocks.push({
        object: "block",
        type: "heading_1",
        heading_1: { rich_text: richText(h1Match[1].trim()) },
      });
      i++;
      continue;
    }
    const h2Match = line.match(/^## (.+)/);
    if (h2Match) {
      blocks.push({
        object: "block",
        type: "heading_2",
        heading_2: { rich_text: richText(h2Match[1].trim()) },
      });
      i++;
      continue;
    }
    const h3Match = line.match(/^### (.+)/);
    if (h3Match) {
      blocks.push({
        object: "block",
        type: "heading_3",
        heading_3: { rich_text: richText(h3Match[1].trim()) },
      });
      i++;
      continue;
    }
    const h4Match = line.match(/^#### (.+)/);
    if (h4Match) {
      // Notion doesn't have h4, use bold paragraph
      blocks.push({
        object: "block",
        type: "heading_3",
        heading_3: { rich_text: richText(h4Match[1].trim()) },
      });
      i++;
      continue;
    }

    // Table
    if (line.includes("|") && i + 1 < lines.length && /\|[\s-:]+\|/.test(lines[i + 1])) {
      const tableRows = [];
      // Header row
      tableRows.push(parseTableRow(line));
      i++; // skip separator
      i++;
      // Data rows
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        tableRows.push(parseTableRow(lines[i]));
        i++;
      }
      if (tableRows.length > 0) {
        const colCount = tableRows[0].length;
        blocks.push({
          object: "block",
          type: "table",
          table: {
            table_width: colCount,
            has_column_header: true,
            has_row_header: false,
            children: tableRows.map((cells) => ({
              object: "block",
              type: "table_row",
              table_row: {
                cells: cells.map((cell) => richText(cell)),
              },
            })),
          },
        });
      }
      continue;
    }

    // Checkbox list
    const todoMatch = line.match(/^- \[([ xX])\] (.+)/);
    if (todoMatch) {
      blocks.push({
        object: "block",
        type: "to_do",
        to_do: {
          rich_text: richText(todoMatch[2].trim()),
          checked: todoMatch[1] !== " ",
        },
      });
      i++;
      continue;
    }

    // Bulleted list
    const bulletMatch = line.match(/^[-*] (.+)/);
    if (bulletMatch) {
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: richText(bulletMatch[1].trim()),
        },
      });
      i++;
      continue;
    }

    // Numbered list
    const numMatch = line.match(/^\d+\.\s+(.+)/);
    if (numMatch) {
      blocks.push({
        object: "block",
        type: "numbered_list_item",
        numbered_list_item: {
          rich_text: richText(numMatch[1].trim()),
        },
      });
      i++;
      continue;
    }

    // Default: paragraph
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: richText(line.trim()) },
    });
    i++;
  }

  return blocks;
}

function parseTableRow(line) {
  return line
    .split("|")
    .map((c) => c.trim())
    .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
}

function splitLongText(text) {
  // Notion limits each rich_text segment to 2000 chars
  const MAX = 2000;
  const parts = [];
  for (let i = 0; i < text.length; i += MAX) {
    parts.push({
      type: "text",
      text: { content: text.slice(i, i + MAX) },
    });
  }
  return parts;
}

// ─── Main ───

async function main() {
  console.log("Reading docs...");
  const files = readdirSync(DOCS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  console.log(`Found ${files.length} docs: ${files.join(", ")}`);

  // Query existing pages in the database
  console.log("\nQuerying existing pages in Documents DB...");
  const existing = await queryDatabase();
  const existingPages = existing.results.map((p) => {
    const titleProp = p.properties["ページ"];
    const title = titleProp?.title?.map((t) => t.plain_text).join("") || "";
    return { id: p.id, title, archived: p.archived };
  });
  console.log(
    `Existing pages: ${existingPages.length} (${existingPages.map((p) => p.title || "(untitled)").join(", ")})`
  );

  // Archive existing empty/untitled pages
  for (const p of existingPages) {
    if (!p.title && !p.archived) {
      console.log(`  Archiving untitled page ${p.id}...`);
      await archivePage(p.id);
    }
  }

  // Create pages for each doc
  for (const file of files) {
    const filepath = join(DOCS_DIR, file);
    const md = readFileSync(filepath, "utf-8");

    // Extract title from first # heading
    const titleMatch = md.match(/^# (.+)/m);
    const title = titleMatch
      ? titleMatch[1].trim()
      : basename(file, ".md");

    console.log(`\n--- ${file} → "${title}" ---`);

    // Check if page already exists
    const existingPage = existingPages.find((p) => p.title === title);
    if (existingPage) {
      console.log(`  Page already exists (${existingPage.id}), skipping.`);
      continue;
    }

    // Parse markdown to Notion blocks
    const allBlocks = parseMarkdownToBlocks(md);
    console.log(`  Parsed ${allBlocks.length} blocks`);

    // Create page with first 100 blocks
    const page = await createPage(title, allBlocks);
    console.log(`  Created page: ${page.id}`);

    // Append remaining blocks in batches of 100
    if (allBlocks.length > 100) {
      for (let start = 100; start < allBlocks.length; start += 100) {
        const batch = allBlocks.slice(start, start + 100);
        console.log(
          `  Appending blocks ${start}-${start + batch.length}...`
        );
        await appendChildren(page.id, batch);
      }
    }

    // Rate limit: small delay between pages
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("\nDone! All docs synced to Notion.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
