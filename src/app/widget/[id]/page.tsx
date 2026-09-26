import { notFound } from "next/navigation";
import ChatWidget from "@/components/ChatWidget";
import { callPython } from "@/lib/python-bridge";

export const dynamic = "force-dynamic";

interface BotConfig {
  id: string;
  name: string;
  avatar: string;
  primaryColor: string;
  welcomeMessage: string;
  websiteUrl: string;
  leadCaptureEnabled?: boolean;
  leadCapturePrompt?: string;
  suggestedQuestions?: string[];
}

export default async function PublicWidgetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Bot configuration is served by the Python backend.
  const result = await callPython("get_bot_config", { botId: id });
  const bot = result.bot as BotConfig | undefined;

  if (!result.success || !bot) {
    notFound();
  }

  return (
    <div className="h-screen w-full bg-slate-950 flex flex-col p-2 sm:p-4">
      <div className="flex-1 max-w-2xl w-full mx-auto h-full min-h-0 shadow-2xl">
        <ChatWidget bot={bot} mode="embedded" />
      </div>
    </div>
  );
}
