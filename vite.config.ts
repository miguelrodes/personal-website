import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { profile, projects } from "./src/content.ts";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

// Real HTML entry files let ordinary static hosts serve direct project URLs.
export default defineConfig({
  plugins: [
    react(),
    {
      name: "static-project-routes",
      apply: "build",
      closeBundle() {
        const output = resolve("dist");
        const html = readFileSync(resolve(output, "index.html"), "utf8");
        for (const project of projects) {
          const directory = resolve(output, "work", project.slug);
          mkdirSync(directory, { recursive: true });
          writeFileSync(
            resolve(directory, "index.html"),
            html
              .replace(
                /<title>.*?<\/title>/,
                `<title>${escapeHtml(`${project.title} — ${profile.name}`)}</title>`,
              )
              .replace(
                /(<meta name="description" content=")[^"]*("\s*\/>)/,
                `$1${escapeHtml(project.summary)}$2`,
              ),
          );
        }
        writeFileSync(
          resolve(output, "404.html"),
          html.replace(
            /<title>.*?<\/title>/,
            `<title>Page not found — ${escapeHtml(profile.name)}</title>`,
          ),
        );
      },
    },
  ],
});
