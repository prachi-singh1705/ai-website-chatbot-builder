import { pythonJson } from "@/lib/python-bridge";

export const dynamic = "force-dynamic";

// GET /api/presets -> demo website knowledge bases shipped with the Python backend
export async function GET() {
  return pythonJson("list_presets");
}
