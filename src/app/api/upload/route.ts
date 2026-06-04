import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const data = await req.formData();
    const file: File | null = data.get("file") as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 });
    }

    // Convert file to base64 for Vercel Serverless environment compatibility
    // In a real production app with heavy traffic, consider using AWS S3, Supabase Storage, or Cloudinary.
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Create Data URL
    const mimeType = file.type || 'image/jpeg';
    const base64Data = buffer.toString('base64');
    const fileUrl = `data:${mimeType};base64,${base64Data}`;

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error) {
    console.error("Error processing file:", error);
    return NextResponse.json({ success: false, message: "Error processing file" }, { status: 500 });
  }
}
