import { supabase, ChildProfile } from "@/lib/supabase";
import ProfileForm from "@/components/ProfileForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { data } = await supabase.from("child_profile").select("*").limit(1);
  const profile = (data?.[0] ?? null) as ChildProfile | null;

  return (
    <div>
      <div className="bg-green-600 text-white p-4 sticky top-0 z-10">
        <h1 className="text-lg font-semibold">⚙️ 設定・プロフィール</h1>
      </div>
      <div className="p-4 space-y-4">
        {profile?.hospital_phone && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-xs font-semibold text-red-600 mb-1">🚨 緊急連絡先</p>
            <p className="font-bold text-red-800">{profile.hospital_name}</p>
            <a
              href={`tel:${profile.hospital_phone}`}
              className="text-red-700 font-semibold text-lg"
            >
              📞 {profile.hospital_phone}
            </a>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold mb-4 text-gray-800">👶 子供の情報</h2>
          <ProfileForm profile={profile} />
        </div>
      </div>
    </div>
  );
}
