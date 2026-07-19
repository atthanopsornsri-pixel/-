import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rate-limit";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // Rate-limit ต่อผู้ใช้ กันอัปโหลดถล่ม storage (30 ไฟล์ / 10 นาที)
    const rl = await rateLimit(`upload:${session.user.id}`, 30, 10 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ success: false, message: "อัปโหลดบ่อยเกินไป กรุณารอสักครู่" }, { status: 429 });
    }

    const data = await req.formData();
    const file: File | null = data.get("file") as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 });
    }

    const mimeType = file.type || "image/jpeg";
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { success: false, message: "ประเภทไฟล์ไม่รองรับ — อนุญาตเฉพาะ JPEG, PNG, WebP, GIF" },
        { status: 415 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, message: "ไฟล์ใหญ่เกิน 5 MB — กรุณาบีบอัดรูปก่อนอัปโหลด" },
        { status: 413 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // อัปโหลดไป Supabase Storage ถ้าตั้งค่าไว้ (ลด DB bloat จาก base64)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseServiceKey) {
      const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : mimeType.includes("gif") ? "gif" : "jpg";
      const filename = `uploads/${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filename, buffer, { contentType: mimeType, upsert: false });

      if (!uploadError) {
        return NextResponse.json({ success: true, url: filename });
      }
      console.error("[upload] Supabase error (falling back to base64):", uploadError.message);
    }

    // Fallback: base64 data URL (ถ้าไม่ได้ตั้งค่า Supabase หรือ upload ล้มเหลว)
    const base64Data = buffer.toString("base64");
    const fileUrl = `data:${mimeType};base64,${base64Data}`;
    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error) {
    console.error("[upload] Error processing file:", error);
    return NextResponse.json({ success: false, message: "Error processing file" }, { status: 500 });
  }
}
