import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { data, error } = await supabase
    .from("child_profile")
    .select("*")
    .limit(1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data?.[0] ?? null);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { data: existing } = await supabase
    .from("child_profile")
    .select("id")
    .limit(1);
  const existingId = existing?.[0]?.id;

  let result;
  if (existingId) {
    result = await supabase
      .from("child_profile")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", existingId)
      .select()
      .single();
  } else {
    if (!body.name) {
      return NextResponse.json({ error: "名前は必須です" }, { status: 400 });
    }
    result = await supabase
      .from("child_profile")
      .insert(body)
      .select()
      .single();
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }
  return NextResponse.json(result.data);
}
