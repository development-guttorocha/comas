import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/** Assistants that answer with the web: welcome to read the portfolio (and its `llms.txt`). */
const AI_CRAWLERS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot", "anthropic-ai",
  "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "CCBot", "Meta-ExternalAgent", "Bytespider", "Amazonbot", "DuckAssistBot", "MistralAI-User",
];
const PRIVATE = ["/admin", "/api/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: PRIVATE },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
