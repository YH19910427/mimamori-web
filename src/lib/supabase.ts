import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface ChildProfile {
  id: string;
  name: string;
  nickname: string | null;
  birth_date: string | null;
  blood_type: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  allergies: string[] | null;
  hospital_name: string | null;
  hospital_phone: string | null;
  hospital_address: string | null;
  updated_at: string;
}

export interface DailyRecord {
  id: string;
  date: string;
  type: "meal" | "sleep" | "temperature" | "weight" | "note";
  value: string;
  notes: string;
  created_at: string;
}

export interface DocumentKeyFacts {
  events?: { date: string; name: string }[];
  items?: string[];
  notes?: string[];
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  category: "nursery" | "medical" | "preference" | "other";
  content: string;
  created_at: string;
  summary: string | null;
  source_type: "image" | "pdf" | "text" | null;
  original_file_path: string | null;
  source_date: string | null;
  tags: string[] | null;
  key_facts: DocumentKeyFacts | null;
}

export interface Conversation {
  id: string;
  user_message: string;
  ai_response: string;
  mode: "normal" | "emergency";
  created_at: string;
}
