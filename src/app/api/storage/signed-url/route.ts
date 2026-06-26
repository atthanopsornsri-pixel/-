import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSecurePrisma } from "@/lib/prisma-secure";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { filePath, bucket = "documents" } = await req.json();

    if (!filePath) {
      return NextResponse.json({ error: "Missing filePath" }, { status: 400 });
    }

    // Extract the actual filename or path segment that would be stored in the DB
    // e.g., if filePath is "slips/my-slip.jpg", the DB might just store "slips/my-slip.jpg" or "my-slip.jpg"
    const fileName = filePath.split('/').pop() || filePath;

    const secureDb = await getSecurePrisma();

    // STRICT VALIDATION (Phase 3 Requirement)
    // We check if this file belongs to ANY record that the current user (OWNER or TENANT) is allowed to see.
    // Thanks to Phase 1 (getSecurePrisma), this query will ONLY return results if the user is authorized!
    
    const [isBillSlip, isPaymentSlip, isTenantSignature, isContractPdf, isPropertySignature, isPropertyImage, isRoomImage] = await Promise.all([
      secureDb.bill.findFirst({ where: { slipUrl: { contains: fileName } } }),
      secureDb.payment.findFirst({ where: { slipUrl: { contains: fileName } } }),
      secureDb.tenant.findFirst({ where: { signatureUrl: { contains: fileName } } }),
      secureDb.tenant.findFirst({ where: { contractPdfUrl: { contains: fileName } } }),
      secureDb.property.findFirst({ where: { signatureUrl: { contains: fileName } } }),
      secureDb.property.findFirst({ where: { imageUrl: { contains: fileName } } }),
      secureDb.room.findFirst({
        where: {
          OR: [
            { imageMain: { contains: fileName } },
            { imageBathroom: { contains: fileName } },
            { imageBalcony: { contains: fileName } },
            { imageFacility: { contains: fileName } }
          ]
        }
      })
    ]);

    if (!isBillSlip && !isPaymentSlip && !isTenantSignature && !isContractPdf && !isPropertySignature && !isPropertyImage && !isRoomImage) {
        // Not found in any secure context, or the user is trying to access a file they don't own!
        return NextResponse.json({ error: "Forbidden: You do not have permission to access this file." }, { status: 403 });
    }

    // If we reach here, getSecurePrisma has confirmed the user owns/has access to the record!
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[SIGNED-URL] Missing Supabase env vars");
      return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
    }

    // Must use SERVICE ROLE KEY to bypass RLS, because the bucket is Private and Supabase doesn't know NextAuth
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create a temporary signed URL valid for 60 seconds
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 60);

    if (error || !data) {
      console.error("Supabase Storage error:", error);
      return NextResponse.json({ error: "Failed to generate temporary URL" }, { status: 500 });
    }

    return NextResponse.json({ signedUrl: data.signedUrl });

  } catch (error) {
    console.error("Signed URL generation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
