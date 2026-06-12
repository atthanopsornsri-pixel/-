import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendLineOAMessage } from "@/lib/line";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** แปลง Date → วันที่ไทย พ.ศ. แบบอ่านง่าย เช่น "5 กรกฎาคม 2569" */
function toThaiDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 1. ดึงข้อมูลบิลพร้อมชื่อผู้เช่าและ Token ของเจ้าของ
    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        room: {
          include: {
            tenants: {
              where: { isDeleted: false },
              // ดึงชื่อ-นามสกุลผู้เช่าด้วย
              select: {
                lineUserId: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
            property: {
              include: { owner: true },
            },
          },
        },
      },
    });

    if (!bill)
      return NextResponse.json({ message: "ไม่พบข้อมูลบิล" }, { status: 404 });

    if (bill.room.property.ownerId !== session.user.id) {
      return NextResponse.json(
        { message: "Unauthorized: bill does not belong to your property" },
        { status: 403 }
      );
    }

    const tenant = bill.room.tenants[0];
    const ownerUser = bill.room.property.owner;
    const propertyName = bill.room.property.name;

    const token = ownerUser?.lineChannelAccessToken;
    const targetLineId = tenant?.lineUserId;

    if (!token)
      return NextResponse.json(
        { message: "หอพักยังไม่ได้ตั้งค่า LINE OA Token" },
        { status: 400 }
      );
    if (!targetLineId)
      return NextResponse.json(
        { message: "ลูกบ้านห้องนี้ยังไม่ได้ผูกบัญชี LINE" },
        { status: 400 }
      );

    // 2. ประกอบชื่อผู้เช่า
    const tenantName =
      [tenant.firstName, tenant.lastName].filter(Boolean).join(" ") ||
      tenant.phoneNumber ||
      "ผู้เช่า";

    // 3. แปลงปีเป็น พ.ศ. (year ในฐานข้อมูลเก็บ ค.ศ.)
    const yearBE = bill.year + 543;

    // 4. ลิงก์ระบบ (ใช้ NEXTAUTH_URL เป็น base)
    const appUrl =
      process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://jadhor.vercel.app";
    const paymentUrl = `${appUrl}/dashboard/my-bills`;

    // 5. สร้างรายการค่าใช้จ่ายเฉพาะที่มีจริง
    const lines: string[] = [];
    if (bill.rentAmount > 0)
      lines.push(`• ค่าเช่าห้อง: ฿${bill.rentAmount.toLocaleString()}`);
    if (bill.waterAmount > 0)
      lines.push(
        `• ค่าน้ำ (${bill.waterUnits ?? 0} หน่วย): ฿${bill.waterAmount.toLocaleString()}`
      );
    if (bill.electricAmount > 0)
      lines.push(
        `• ค่าไฟ (${bill.electricUnits ?? 0} หน่วย): ฿${bill.electricAmount.toLocaleString()}`
      );
    if ((bill.commonFee ?? 0) > 0)
      lines.push(`• ค่าส่วนกลาง: ฿${bill.commonFee!.toLocaleString()}`);
    if ((bill.parkingFee ?? 0) > 0)
      lines.push(`• ค่าจอดรถ: ฿${bill.parkingFee!.toLocaleString()}`);
    if ((bill.internetFee ?? 0) > 0)
      lines.push(`• ค่าอินเทอร์เน็ต: ฿${bill.internetFee!.toLocaleString()}`);
    if ((bill.otherFee ?? 0) > 0)
      lines.push(`• ค่าบริการอื่นๆ: ฿${bill.otherFee!.toLocaleString()}`);

    // 6. ร่างข้อความ — แยกตามสถานะบิล
    //    PAID → ใบเสร็จ/ขอบคุณ (ไม่ใช่ใบแจ้งหนี้+กำหนดชำระ ที่ทำให้ลูกบ้านสับสน)
    const rangeBE = bill.type === "CHECKIN" ? "บิลเข้าอยู่" : `ประจำเดือน ${bill.month}/${yearBE}`;
    const messageText =
      bill.status === "PAID"
        ? [
            `✅ ได้รับชำระเงินเรียบร้อยแล้ว — ${propertyName}`,
            `ขอบคุณคุณ${tenantName} 🙏`,
            `━━━━━━━━━━━━━━━━━━━━`,
            `🚪 ห้อง ${bill.room.number}  |  ${rangeBE}`,
            ...lines,
            `━━━━━━━━━━━━━━━━━━━━`,
            `💰 ยอดที่ชำระ: ฿${bill.totalAmount.toLocaleString()}`,
            bill.paymentDate ? `📅 วันที่ชำระ: ${toThaiDate(bill.paymentDate)}` : "",
            `━━━━━━━━━━━━━━━━━━━━`,
            `ขอบคุณที่ชำระตรงเวลา 💚`,
          ].filter(Boolean).join("\n")
        : [
            `🧾 ใบแจ้งหนี้ค่าเช่า — ${propertyName}`,
            `สวัสดีคุณ${tenantName} 🙏`,
            `━━━━━━━━━━━━━━━━━━━━`,
            `🏠 ${propertyName}`,
            `🚪 ห้อง ${bill.room.number}  |  ${rangeBE}`,
            `━━━━━━━━━━━━━━━━━━━━`,
            ...lines,
            `━━━━━━━━━━━━━━━━━━━━`,
            `💰 ยอดรวมทั้งสิ้น: ฿${bill.totalAmount.toLocaleString()}`,
            `📅 กำหนดชำระ: ${toThaiDate(bill.dueDate)}`,
            `━━━━━━━━━━━━━━━━━━━━`,
            `👉 ชำระเงินและแนบสลิปได้ที่:`,
            paymentUrl,
          ].join("\n");

    // 7. ส่งข้อความ
    const result = await sendLineOAMessage(targetLineId, messageText, token);

    if (!result.success) {
      // result.error ผ่าน humanizeLineError มาแล้ว — เป็นภาษาไทยที่เจ้าของแก้ได้
      return NextResponse.json(
        { message: result.error || "ส่งข้อความผ่าน LINE ไม่สำเร็จ" },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
