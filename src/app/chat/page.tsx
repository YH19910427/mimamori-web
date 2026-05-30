import ChatInterface from "@/components/ChatInterface";

export default function ChatPage() {
  return (
    <div>
      <div className="bg-green-600 text-white p-4 sticky top-0 z-10">
        <h1 className="text-lg font-semibold">💬 AIに話しかける</h1>
        <p className="text-xs opacity-75 mt-0.5">Gemini 2.0 Flash（無料）</p>
      </div>
      <ChatInterface />
    </div>
  );
}
