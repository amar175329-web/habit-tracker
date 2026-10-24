/// <reference types="node" />
// Vercel serverless entry — bridges Node.js (req, res) to Hono via @hono/node-server
import { getRequestListener } from "@hono/node-server";
import app from "../worker/index.js";

export const config = {
  runtime: "nodejs",
};

const listener = getRequestListener(app.fetch);

export default function handler(req: any, res: any) {
  // If Vercel rewrote the URL to include [[...route]], recover original URL from headers
  const matched = req.headers["x-matched-path"] || req.headers["x-forwarded-uri"];
  if (matched && typeof matched === "string" && (req.url?.includes("[[...route]]") || req.url?.includes("[...route]"))) {
    const qIdx = req.url.indexOf("?");
    const query = qIdx !== -1 ? req.url.slice(qIdx) : "";
    req.url = matched.split("?")[0] + query;
  }
  return listener(req, res);
}
