"use client";
import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "ai";
  content: string;
  isEmergency?: boolean;
}

const QUICK_QUESTIONS = [
  "今日の夕飯は何がいい？",
  "保育園の持ち物は？",
  "緊急、病院の電話番号は？",
];

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (question: string) => {
    const q = question.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setLoading(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: data.answer ?? data.error ?? "エラーが発生しました",
          isEmergency: q.includes("緊急"),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "通信エラーが発生しました" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 136px)" }}>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 pt-8">
            <p className="text-5xl mb-3">🌱</p>
            <p className="font-medium text-gray-500">何でも聞いてください</p>
            <div className="mt-5 space-y-2">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="block w-full text-left text-sm bg-green-50 text-green-700 rounded-xl px-4 py-2.5 hover:bg-green-100 active:opacity-70"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                msg.role === "user"
                  ? "bg-green-600 text-white rounded-br-md"
                  : msg.isEmergency
                  ? "bg-red-50 border border-red-200 text-red-900 rounded-bl-md"
                  : "bg-white text-gray-800 rounded-bl-md"
              }`}
            >
              {msg.role === "ai" && msg.isEmergency && (
                <p className="font-bold text-red-600 mb-2 text-xs">
                  🚨 緊急モード起動
                </p>
              )}
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 text-sm text-gray-400 shadow-sm">
              考え中...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 bg-white border-t border-gray-200 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage(input);
            }
          }}
          placeholder="質問を入力..."
          disabled={loading}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-green-500 disabled:opacity-50"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          className="bg-green-600 text-white rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-40 active:opacity-70 shrink-0"
        >
          送信
        </button>
      </div>
    </div>
  );
}
