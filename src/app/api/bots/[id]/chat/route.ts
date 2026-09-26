import { pythonJson } from "@/lib/python-bridge";

export const dynamic = "force-dynamic";

// POST /api/bots/:id/chat -> py_backend.rag hybrid retrieval + answer synthesis
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await req.json().catch(() => ({}));
  return pythonJson("chat", { ...payload, botId: id });
}
