import { supabase, KnowledgeDocument } from "@/lib/supabase";
import DocumentUpload from "@/components/DocumentUpload";

export const dynamic = "force-dynamic";

const CAT_LABEL: Record<string, string> = {
  nursery: "🏫 保育園",
  medical: "🏥 医療",
  preference: "❤️ 好み",
  other: "📄 その他",
};

export default async function KnowledgePage() {
  const { data } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });
  const documents = (data ?? []) as KnowledgeDocument[];

  return (
    <div>
      <div className="bg-green-600 text-white p-4 sticky top-0 z-10">
        <h1 className="text-lg font-semibold">📚 ナレッジ管理</h1>
        <p className="text-xs opacity-75 mt-0.5">AIが参照する情報を管理</p>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold mb-3 text-gray-800">📎 情報を追加</h2>
          <DocumentUpload />
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold mb-3 text-gray-800">
            📄 登録済みドキュメント（{documents.length}件）
          </h2>
          {documents.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              ドキュメントがありません
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {documents.map((doc) => (
                <div key={doc.id} className="py-3">
                  <div className="flex gap-2 items-start">
                    <span className="text-sm text-gray-400 shrink-0">
                      {CAT_LABEL[doc.category] ?? "📄"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-800 truncate">
                        {doc.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {doc.source_date
                          ? `対象: ${doc.source_date}`
                          : new Date(doc.created_at).toLocaleDateString("ja-JP")}
                      </p>
                      {doc.summary && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {doc.summary}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
