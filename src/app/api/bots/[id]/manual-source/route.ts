import { pythonJson } from "@/lib/python-bridge";

export const dynamic = "force-dynamic";

// POST /api/bots/:id/manual-source -> index pasted docs / FAQs into the knowledge base
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await req.json().catch(() => ({}));
  return pythonJson("add_manual_source", { ...payload, botId: id });
}
