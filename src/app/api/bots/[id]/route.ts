import { pythonJson } from "@/lib/python-bridge";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/bots/:id -> bot + sources + leads + conversations
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return pythonJson("get_bot", { botId: id });
}

// PATCH /api/bots/:id -> persona / styling / guardrail updates
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const payload = await req.json().catch(() => ({}));
  return pythonJson("update_bot", { ...payload, botId: id });
}

// DELETE /api/bots/:id -> cascade delete bot + knowledge + analytics
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return pythonJson("delete_bot", { botId: id });
}
