// Shared template rendering engine.
// Used by build.js (Node) and functions/api/preview.js (Cloudflare Worker).

import { marked } from "marked";

function resolve(obj, keyPath) {
  return keyPath.split(".").reduce((acc, k) => (acc != null ? acc[k] : undefined), obj);
}

// Convert markdown to HTML using the full CommonMark spec via marked
export function markdownToHtml(text) {
  if (typeof text !== "string" || !text) return text;
  return marked.parse(text);
}

// Apply inline markdown only (for short text values like titles, descriptions).
// Skip values that look like URLs, paths, or lack any markdown syntax.
export function inlineMarkdown(text) {
  if (typeof text !== "string" || !text) return text;
  if (/^(\/|#|https?:|tel:|mailto:)/i.test(text)) return text;
  if (!/[*~`\[]/.test(text)) return text;
  return marked.parseInline(text);
}

// Process markdown widget fields in content before rendering
export function processMarkdown(data) {
  if (data.about?.body) data.about.body = markdownToHtml(data.about.body);
  for (const item of data.education?.items || []) {
    if (item.description) item.description = markdownToHtml(item.description);
  }
  for (const item of data.faq?.items || []) {
    if (item.answer) item.answer = markdownToHtml(item.answer);
  }
  return data;
}

// Render a template string with content data
export function render(template, data) {
  let out = template;

  // {{#if key}}...{{/if}} — innermost first (no nested #if inside body)
  while (/\{\{#if\s+/.test(out)) {
    out = out.replace(/\{\{#if\s+([\w.]+)\}\}((?:(?!\{\{#if)[\s\S])*?)\{\{\/if\}\}/g, (_, key, body) => {
      return resolve(data, key) ? body : "";
    });
  }

  // {{#each key}}...{{/each}}
  out = out.replace(/\{\{#each\s+([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, key, body) => {
    const arr = resolve(data, key);
    if (!Array.isArray(arr)) return "";
    return arr.map((item, i) => {
      let chunk = body.replace(/\{\{@index\}\}/g, String(i));
      return chunk.replace(/\{\{(\w+)\}\}/g, (m, f) => {
        if (item[f] == null) return m;
        const str = String(item[f]);
        if (/<[a-z][\s\S]*>/i.test(str)) return str;
        return inlineMarkdown(str.replace(/\n/g, "<br>"));
      });
    }).join("");
  });

  // {{currentYear}}
  out = out.replace(/\{\{currentYear\}\}/g, String(new Date().getFullYear()));

  // {{key.subkey}} — apply inline markdown + newline handling to all text values
  out = out.replace(/\{\{([\w.]+)\}\}/g, (_, kp) => {
    const v = resolve(data, kp);
    if (v == null || typeof v === "object") return "";
    const str = String(v);
    if (/<[a-z][\s\S]*>/i.test(str)) return str;
    return inlineMarkdown(str.replace(/\n/g, "<br>"));
  });

  return out;
}
