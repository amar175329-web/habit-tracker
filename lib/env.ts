/// <reference types="node" />
// Vercel-safe env access. Cloudflare uses c.env bindings; Vercel uses process.env.
export function env(name: string, fallback = ""): string {
  const v = process.env[name];
  return v && v.length > 0 ? v : fallback;
}
