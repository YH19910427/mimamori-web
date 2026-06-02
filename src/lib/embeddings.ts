import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MAX_CHARS = 8000;

export async function generateEmbedding(
  text: string,
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"
): Promise<number[]> {
  // text-embedding-004 returns 768 dims by default, no outputDimensionality needed
  const model = genai.getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent({
    content: { parts: [{ text: text.slice(0, MAX_CHARS) }], role: "user" },
    taskType:
      taskType === "RETRIEVAL_DOCUMENT"
        ? TaskType.RETRIEVAL_DOCUMENT
        : TaskType.RETRIEVAL_QUERY,
  });
  return result.embedding.values;
}
