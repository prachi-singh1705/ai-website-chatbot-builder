import { pythonJson } from "@/lib/python-bridge";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/bots/:id/leads -> captured contact inquiries
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return pythonJson("list_leads", { botId: id });
}

// POST /api/bots/:id/leads -> store a lead captured inside the chat
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const payload = await req.json().catch(() => ({}));
  return pythonJson("create_lead", { ...payload, botId: id });
}
