import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendLineOAMessage } from "@/lib/line";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 1. ดึงข้อมูลบิล พร้อมข้อมูลลูกบ้านและ Token ของเจ้าของหอพัก
    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        room: {
          include: {
            tenants: {
              where: { isDeleted: false },
              include: { user: true } // ดึง lineUserId ของลูกบ้าน
            },
            property: {
              include: { owner: true } // ดึง lineChannelAccessToken ของเจ้าของตึก
            }
          }
        }
      }
    });

    if (!bill) return NextResponse.json({ message: "ไม่พบข้อมูลบิล" }, { status: 404 });

    // ตรวจสิทธิ์: เจ้าของหอพักต้องเป็นเจ้าของห้องที่สร้างบิลนี้
    if (bill.room.property.ownerId !== session.user.id) {
      return NextResponse.json({ message: "Unauthorized: bill does not belong to your property" }, { status: 403 });
    }

    const tenant = bill.room.tenants[0];
    const ownerUser = bill.room.property.owner;

    const token = ownerUser?.lineChannelAccessToken;
    const targetLineId = tenant?.lineUserId; // Use Tenant.lineUserId (as designed and registered in schema)

    if (!token) return NextResponse.json({ message: "หอพักยังไม่ได้ตั้งค่า LINE OA Token" }, { status: 400 });
    if (!targetLineId) return NextResponse.json({ message: "ลูกบ้านห้องนี้ยังไม่ได้ผูกบัญชี LINE" }, { status: 400 });

    // 2. ร่างข้อความเขียนบิลให้สวยงามอ่านง่าย
    const messageText = `🧾 ใบแจ้งหนี้ค่าเช่าห้อง ${bill.room.number}
ประจำเดือน: ${bill.month}/${bill.year}

• ค่าเช่าห้อง: ฿${bill.rentAmount.toLocaleString()}
• ค่าน้ำ (${bill.waterUnits || 0} หน่วย): ฿${bill.waterAmount.toLocaleString()}
• ค่าไฟ (${bill.electricUnits || 0} หน่วย): ฿${bill.electricAmount.toLocaleString()}
${bill.otherFee ? `• ค่าบริการอื่นๆ: ฿${bill.otherFee.toLocaleString()}\n` : ""}
💰 ยอดรวมทั้งสิ้น: ฿${bill.totalAmount.toLocaleString()}
📅 กำหนดชำระ: ${new Date(bill.dueDate).toLocaleDateString('th-TH')}

สามารถตรวจสอบรายละเอียดเต็มและแนบสลิปชำระเงินได้ที่ระบบ JadHor OS ครับ`;

    // 3. ยิงคำสั่งส่งข้อความผ่าน LINE OA Messaging API
    const result = await sendLineOAMessage(targetLineId, messageText, token);

    if (!result.success) {
      return NextResponse.json({ message: "LINE API Error", detail: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
