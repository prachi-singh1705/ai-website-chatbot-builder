import { pythonJson } from "@/lib/python-bridge";

export const dynamic = "force-dynamic";

// POST /api/bots/:id/crawl -> py_backend.scraper fetch + chunk + index a new page
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await req.json().catch(() => ({}));
  return pythonJson("crawl_url", { ...payload, botId: id });
}
