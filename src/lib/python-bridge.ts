/**
 * Node -> Python bridge.
 *
 * Every piece of application logic (crawling, chunking, RAG retrieval, answer
 * synthesis, persistence, lead capture, embed generation) lives in the
 * `py_backend` Python package. These helpers simply spawn the Python CLI,
 * hand it a JSON payload on stdin and parse the JSON document it prints.
 */

import { spawn } from "node:child_process";

export type PythonAction =
  | "health"
  | "seed"
  | "list_presets"
  | "list_bots"
  | "create_bot"
  | "get_bot"
  | "get_bot_config"
  | "update_bot"
  | "delete_bot"
  | "chat"
  | "crawl_url"
  | "add_manual_source"
  | "list_chunks"
  | "list_leads"
  | "create_lead"
  | "rate_message"
  | "embed_script";

export interface PythonResult {
  success?: boolean;
  error?: string;
  status?: number;
  [key: string]: unknown;
}

const PYTHON_BIN = process.env.PYTHON_BIN || "python3";

/**
 * Resolved lazily at runtime: the Python package ships next to the app on disk
 * and must never be pulled into the JS bundle / trace graph.
 */
function resolveProjectRoot(): string {
  return process.env.SITEMIND_PROJECT_ROOT || process.cwd();
}

function resolveCliEntry(): string {
  return `${resolveProjectRoot()}/py_backend/cli.py`;
}

/** Actions that perform live network crawling need a longer budget. */
const LONG_RUNNING: PythonAction[] = ["create_bot", "crawl_url", "chat"];

export function callPython<T extends PythonResult = PythonResult>(
  action: PythonAction,
  payload: Record<string, unknown> = {}
): Promise<T> {
  const timeoutMs = LONG_RUNNING.includes(action) ? 90_000 : 25_000;

  return new Promise<T>((resolve) => {
    let settled = false;
    const finish = (value: PythonResult) => {
      if (!settled) {
        settled = true;
        resolve(value as T);
      }
    };

    let child;
    try {
      child = spawn(PYTHON_BIN, [resolveCliEntry(), action], {
        cwd: resolveProjectRoot(),
        env: {
          ...process.env,
          PYTHONUNBUFFERED: "1",
          PYTHONDONTWRITEBYTECODE: "1",
          PYTHONIOENCODING: "utf-8",
        },
      });
    } catch (err) {
      finish({
        success: false,
        status: 500,
        error: `Unable to start the Python backend: ${
          err instanceof Error ? err.message : String(err)
        }`,
      });
      return;
    }

    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish({
        success: false,
        status: 504,
        error: `Python backend timed out while running "${action}".`,
      });
    }, timeoutMs);

    child.stdout.setEncoding("utf-8");
    child.stderr.setEncoding("utf-8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      finish({
        success: false,
        status: 500,
        error: `Python backend error: ${err.message}`,
      });
    });

    child.on("close", () => {
      clearTimeout(timer);
      const trimmed = stdout.trim();
      if (!trimmed) {
        finish({
          success: false,
          status: 500,
          error: stderr.trim() || "Python backend returned an empty response.",
        });
        return;
      }

      // The payload is the last JSON line printed by the CLI.
      const lastLine = trimmed.split("\n").filter(Boolean).pop() as string;
      try {
        finish(JSON.parse(lastLine) as PythonResult);
      } catch {
        finish({
          success: false,
          status: 500,
          error: `Malformed response from the Python backend: ${lastLine.slice(0, 300)}`,
        });
      }
    });

    child.stdin.on("error", () => {
      /* the child may already have exited; handled in close/error */
    });
    child.stdin.end(JSON.stringify(payload));
  });
}

/** Convenience wrapper that maps the Python `status` field onto the HTTP response. */
export async function pythonJson(
  action: PythonAction,
  payload: Record<string, unknown> = {}
): Promise<Response> {
  const result = await callPython(action, payload);
  const status = typeof result.status === "number" ? result.status : result.success === false ? 500 : 200;
  const { status: _omit, trace: _trace, ...body } = result;
  return Response.json(body, { status });
}
