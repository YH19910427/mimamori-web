import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MAX_CHARS = 8000;

export async function generateEmbedding(
  text: string,
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"
): Promise<number[]> {
  const model = genai.getGenerativeModel({ model: "gemini-embedding-001" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts: any = {
    content: { parts: [{ text: text.slice(0, MAX_CHARS) }], role: "user" },
    taskType:
      taskType === "RETRIEVAL_DOCUMENT"
        ? TaskType.RETRIEVAL_DOCUMENT
        : TaskType.RETRIEVAL_QUERY,
    outputDimensionality: 768,
  };
  const result = await model.embedContent(opts);
  return result.embedding.values;
}
