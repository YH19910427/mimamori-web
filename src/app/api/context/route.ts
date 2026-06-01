import { buildContext } from "@/lib/context-builder";
import { SYSTEM_PROMPT } from "@/lib/answer";

export async function GET() {
  const context = await buildContext("");
  return Response.json({
    systemPrompt: SYSTEM_PROMPT + "\n\n" + context,
  });
}
