import { pythonJson } from "@/lib/python-bridge";

export const dynamic = "force-dynamic";

// GET /api/bots -> py_backend.services.list_bots
export async function GET() {
  return pythonJson("list_bots");
}

// POST /api/bots -> py_backend.services.create_bot (crawl | preset | pasted text)
export async function POST(req: Request) {
  const payload = await req.json().catch(() => ({}));
  return pythonJson("create_bot", payload);
}
