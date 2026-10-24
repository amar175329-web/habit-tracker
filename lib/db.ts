/// <reference types="node" />
// Native lightweight Turso HTTP client with D1-compatible interface.
// Uses direct /v2/pipeline fetch — 100% serverless-safe, zero dependencies, no native binaries.

function toTursoArg(val: unknown) {
  if (val === null || val === undefined) return { type: "null" as const };
  if (typeof val === "number") {
    if (Number.isInteger(val)) return { type: "integer" as const, value: String(val) };
    return { type: "float" as const, value: val };
  }
  if (typeof val === "boolean") return { type: "integer" as const, value: val ? "1" : "0" };
  return { type: "text" as const, value: String(val) };
}

function parseTursoValue(cell: any) {
  if (!cell || cell.type === "null") return null;
  if (cell.type === "integer") {
    const n = Number(cell.value);
    return Number.isSafeInteger(n) ? n : cell.value;
  }
  if (cell.type === "float") return Number(cell.value);
  return cell.value;
}

async function executePipeline(sql: string, args: unknown[]) {
  let url = (process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "").trim();
  if (!url) throw new Error("TURSO_DATABASE_URL not set");
  if (url.startsWith("libsql://")) {
    url = url.replace(/^libsql:\/\//, "https://");
  }
  url = url.replace(/\/+$/, "");
  const authToken = (process.env.TURSO_AUTH_TOKEN || "").trim();

  const res = await fetch(`${url}/v2/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        {
          type: "execute",
          stmt: {
            sql,
            args: args.map(toTursoArg),
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Turso HTTP ${res.status}: ${txt}`);
  }

  const data = (await res.json()) as any;
  const first = data?.results?.[0];
  if (first?.type === "error") {
    throw new Error(`Turso Error: ${first.error?.message || JSON.stringify(first.error)}`);
  }

  const result = first?.response?.result;
  if (!result) return { results: [], rows: [], meta: {} };

  const cols: string[] = (result.cols || []).map((c: any) => c.name);
  const rows = (result.rows || []).map((rowArr: any[]) => {
    const obj: Record<string, any> = {};
    for (let i = 0; i < cols.length; i++) {
      obj[cols[i]] = parseTursoValue(rowArr[i]);
    }
    return obj;
  });

  return {
    results: rows,
    rows,
    meta: {
      changes: result.affected_row_count ?? 0,
      lastRowId: result.last_insert_rowid ?? null,
    },
    success: true as const,
  };
}

async function executeBatchPipeline(statements: { sql: string; args: unknown[] }[]) {
  if (statements.length === 0) return [];
  let url = (process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "").trim();
  if (!url) throw new Error("TURSO_DATABASE_URL not set");
  if (url.startsWith("libsql://")) {
    url = url.replace(/^libsql:\/\//, "https://");
  }
  url = url.replace(/\/+$/, "");
  const authToken = (process.env.TURSO_AUTH_TOKEN || "").trim();

  const requests = statements.map((s) => ({
    type: "execute",
    stmt: {
      sql: s.sql,
      args: s.args.map(toTursoArg),
    },
  }));

  const res = await fetch(`${url}/v2/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Turso HTTP ${res.status}: ${txt}`);
  }

  const data = (await res.json()) as any;
  const results = data?.results || [];

  return results.map((first: any) => {
    if (first?.type === "error") {
      throw new Error(`Turso Error: ${first.error?.message || JSON.stringify(first.error)}`);
    }

    const result = first?.response?.result;
    if (!result) return { results: [], rows: [], meta: {}, success: true as const };

    const cols: string[] = (result.cols || []).map((c: any) => c.name);
    const rows = (result.rows || []).map((rowArr: any[]) => {
      const obj: Record<string, any> = {};
      for (let i = 0; i < cols.length; i++) {
        obj[cols[i]] = parseTursoValue(rowArr[i]);
      }
      return obj;
    });

    return {
      results: rows,
      rows,
      meta: {
        changes: result.affected_row_count ?? 0,
        lastRowId: result.last_insert_rowid ?? null,
      },
      success: true as const,
    };
  });
}

export class Prepared {
  readonly sql: string;
  readonly args: unknown[] = [];
  constructor(sql: string) {
    this.sql = sql;
  }
  bind(...args: unknown[]): this {
    (this.args as unknown[]).length = 0;
    this.args.push(...args);
    return this;
  }
  async all() {
    return executePipeline(this.sql, this.args);
  }
  async first() {
    const res = await executePipeline(this.sql, this.args);
    return res.rows[0] ?? null;
  }
  async run() {
    return executePipeline(this.sql, this.args);
  }
}

export const db = {
  prepare(sql: string) {
    return new Prepared(sql);
  },
  async batch(statements: Prepared[]) {
    return executeBatchPipeline(statements.map((s) => ({ sql: s.sql, args: s.args })));
  },
};
