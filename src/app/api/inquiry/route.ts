import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    
    const propertyId = formData.get("propertyId") as string;
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;
    const message = formData.get("message") as string;
    
    if (!propertyId || !name || !phone || !message) {
      return NextResponse.redirect(new URL(`/p/${propertyId}?status=error#contact`, req.url), { status: 303 });
    }

    // Get the property and owner
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { owner: true }
    });

    if (property?.owner?.lineToken) {
      import('@/lib/line').then(({ sendLineNotify }) => {
        sendLineNotify(
          property.owner.lineToken!,
          `🔔 ลูกค้าใหม่สนใจจองห้องพัก!\nตึก: ${property.name}\nชื่อ: ${name}\nเบอร์: ${phone}\nข้อความ: ${message}`
        );
      });
    } else {
      console.log(`Inquiry for ${property?.name}: ${name} - ${phone} - ${message}`);
    }

    return NextResponse.redirect(new URL(`/p/${propertyId}?status=success#contact`, req.url), { status: 303 });
  } catch (error) {
    return NextResponse.redirect(new URL(`/?status=error`, req.url), { status: 303 });
  }
}
