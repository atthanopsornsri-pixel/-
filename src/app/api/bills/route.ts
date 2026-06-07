import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSecurePrisma } from "@/lib/prisma-secure";
import { Prisma } from "@prisma/client";
import { sendLineOAMessage } from "@/lib/line";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { 
      roomId, month, year, rentAmount, 
      waterUnits, waterAmount, electricUnits, electricAmount, 
      commonFee, parkingFee, internetFee, otherFee, dueDate 
    } = body;

    if (!roomId || !month || !year || !dueDate) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    if (
      Number(rentAmount) < 0 ||
      Number(waterAmount) < 0 ||
      Number(electricAmount) < 0 ||
      (waterUnits !== undefined && waterUnits !== null && Number(waterUnits) < 0) ||
      (electricUnits !== undefined && electricUnits !== null && Number(electricUnits) < 0) ||
      Number(commonFee || 0) < 0 ||
      Number(parkingFee || 0) < 0 ||
      Number(internetFee || 0) < 0 ||
      Number(otherFee || 0) < 0
    ) {
      return NextResponse.json({ message: "ข้อมูลการเงินหรือค่าหน่วยมิเตอร์ห้ามมีค่าติดลบ" }, { status: 400 });
    }

    const secureDb = await getSecurePrisma();

    // Verify room belongs to this owner and fetch owner details for LINE config
    const room = await secureDb.room.findUnique({
      where: { id: roomId },
      include: {
        property: {
          include: {
            owner: true
          }
        }
      }
    });

    if (!room) {
      return NextResponse.json({ message: "Unauthorized room access" }, { status: 403 });
    }

    // Check if bill already exists for this room, month, year
    const existingBill = await secureDb.bill.findFirst({
      where: { roomId, month: Number(month), year: Number(year) }
    });

    if (existingBill) {
      return NextResponse.json({ message: "บิลของเดือนนี้ถูกสร้างไปแล้ว" }, { status: 400 });
    }

    const totalAmount = 
      Number(rentAmount) + 
      Number(waterAmount) + 
      Number(electricAmount) + 
      Number(commonFee || 0) + 
      Number(parkingFee || 0) + 
      Number(internetFee || 0) + 
      Number(otherFee || 0);

    // secureDb doesn't filter create by default to avoid issues, we verified room ownership above.
    const bill = await prisma.bill.create({
      data: {
        month: Number(month),
        year: Number(year),
        roomId,
        rentAmount: Number(rentAmount),
        waterAmount: Number(waterAmount),
        waterUnits: waterUnits ? Number(waterUnits) : null,
        electricAmount: Number(electricAmount),
        electricUnits: electricUnits ? Number(electricUnits) : null,
        commonFee: Number(commonFee || 0),
        parkingFee: Number(parkingFee || 0),
        internetFee: Number(internetFee || 0),
        otherFee: Number(otherFee || 0),
        totalAmount,
        dueDate: new Date(dueDate),
      },
      include: {
        room: { select: { number: true } }
      }
    });

    // Notify Tenant if they have lineUserId setup
    const tenant = await secureDb.tenant.findFirst({
      where: { roomId },
      select: { lineUserId: true }
    });

    if (room?.property?.owner?.lineChannelAccessToken && tenant?.lineUserId) {
      await sendLineOAMessage(
        tenant.lineUserId,
        `🧾 บิลค่าเช่าใหม่มาแล้ว!\nห้อง: ${bill.room.number}\nประจำเดือน: ${month}/${year}\nยอดชำระ: ฿${totalAmount.toLocaleString()}\nกำหนดชำระ: ${new Date(dueDate).toLocaleDateString('th-TH')}`,
        room.property.owner.lineChannelAccessToken
      );
    }

    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { message: "A bill for this room in this specific month/year already exists (Double-Billing Prevented)." }, 
          { status: 400 }
        );
      }
    }
    
    console.error("Error creating bill:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId");

    let whereClause: any = {};
    if (propertyId && session.user.role === "OWNER") {
      whereClause = { room: { propertyId } };
    }

    const secureDb = await getSecurePrisma();
    
    // getSecurePrisma automatically isolates OWNERs and TENANTs correctly!
    const bills = await secureDb.bill.findMany({
      where: whereClause,
      include: {
        room: { select: { number: true, property: { select: { name: true, promptPayNo: true, promptPayName: true } } } },
      },
      orderBy: [
        { year: "desc" },
        { month: "desc" },
      ],
    });

    return NextResponse.json(bills);
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
