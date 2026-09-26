import { pythonJson } from "@/lib/python-bridge";

export const dynamic = "force-dynamic";

// POST /api/messages/:id/rate -> thumbs up / down feedback on an answer
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await req.json().catch(() => ({}));
  return pythonJson("rate_message", { messageId: id, rating: payload.rating ?? null });
}
