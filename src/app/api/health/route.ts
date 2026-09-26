import { db } from "@/db";
import { sql } from "drizzle-orm";
import { callPython } from "@/lib/python-bridge";

export const dynamic = "force-dynamic";

/**
 * Health check.
 * Primary path: ask the Python backend to bootstrap the schema and ping Postgres.
 * Fallback: direct Postgres ping so the container never reports a false negative.
 */
export async function GET() {
  const result = await callPython("health");

  if (result.ok === true) {
    return Response.json({
      ok: true,
      backend: "python",
      engine: result.engine ?? "sitemind-rag",
      presets: result.presets ?? 0,
    });
  }

  try {
    await db.execute(sql`select 1`);
    return Response.json({
      ok: true,
      backend: "degraded",
      pythonError: result.error ?? "python backend unavailable",
    });
  } catch {
    return Response.json({ ok: false, error: result.error ?? "database unavailable" }, { status: 500 });
  }
}
