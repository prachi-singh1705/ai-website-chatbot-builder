import { pythonJson } from "@/lib/python-bridge";

export const dynamic = "force-dynamic";

// GET /api/bots/:id/chunks?q= -> inspect indexed knowledge chunks
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const search = new URL(req.url).searchParams.get("q") || "";
  return pythonJson("list_chunks", { botId: id, q: search });
}
