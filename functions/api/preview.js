import { render, processMarkdown } from "../../lib/render.mjs";

// Renders a full preview page server-side.
// Static assets (template, CSS, JS) are read via ASSETS binding (no self-fetch deadlock).
// The page is served from the same origin, so relative image paths work.
// A <base href="/"> is injected so paths resolve to the site root.
export async function onRequestPost(context) {
  try {
    // Parse content from form POST or JSON body
    const contentType = context.request.headers.get("Content-Type") || "";
    let content;
    if (contentType.includes("application/json")) {
      content = await context.request.json();
    } else {
      const formData = await context.request.formData();
      content = JSON.parse(formData.get("json"));
    }

    // Read static assets via the ASSETS binding (no HTTP round-trip)
    const [templateRes, cssRes, jsRes] = await Promise.all([
      context.env.ASSETS.fetch(new URL("/template.html", context.request.url)),
      context.env.ASSETS.fetch(new URL("/styles.css", context.request.url)),
      context.env.ASSETS.fetch(new URL("/script.js", context.request.url)),
    ]);

    const template = await templateRes.text();
    const css = await cssRes.text();
    const js = await jsRes.text();

    // Render content into template
    const data = processMarkdown(JSON.parse(JSON.stringify(content)));
    let html = render(template, data);

    // Inject <base href="/"> so relative paths (images, fonts) resolve to site root
    html = html.replace("<head>", '<head><base href="/">');

    // Inline CSS and JS (they're small and this avoids extra requests)
    html = html.replace(/<link rel="stylesheet" href="styles\.css">/, `<style>${css}</style>`);
    html = html.replace(/<script src="script\.js"><\/script>/, `<script>${js}</script>`);

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    const escHtml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return new Response(
      `<html><body><h1>Erreur de prévisualisation</h1><pre>${escHtml(e.message)}\n${escHtml(e.stack)}</pre></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}
