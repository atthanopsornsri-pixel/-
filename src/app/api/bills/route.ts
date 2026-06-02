import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    // Verify room belongs to this owner
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { property: true }
    });

    if (!room || room.property.ownerId !== session.user.id) {
      return NextResponse.json({ message: "Unauthorized room access" }, { status: 403 });
    }

    // Check if bill already exists for this room, month, year
    const existingBill = await prisma.bill.findFirst({
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

    // Notify Tenant if they have Line Token setup
    const tenant = await prisma.tenant.findFirst({
      where: { roomId },
      include: { user: { select: { lineToken: true } } }
    });

    if (tenant?.user?.lineToken) {
      import('@/lib/line').then(({ sendLineNotify }) => {
        sendLineNotify(
          tenant.user.lineToken!,
          `🧾 บิลค่าเช่าใหม่มาแล้ว!\nห้อง: ${bill.room.number}\nประจำเดือน: ${month}/${year}\nยอดชำระ: ฿${totalAmount.toLocaleString()}\nกำหนดชำระ: ${new Date(dueDate).toLocaleDateString('th-TH')}`
        );
      });
    }

    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
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
    
    if (session.user.role === "OWNER") {
      whereClause = {
        room: {
          property: { ownerId: session.user.id }
        }
      };
      if (propertyId) {
        whereClause.room.propertyId = propertyId;
      }
    } else if (session.user.role === "TENANT") {
      const tenant = await prisma.tenant.findUnique({
        where: { userId: session.user.id }
      });
      if (!tenant?.roomId) {
        return NextResponse.json([]);
      }
      whereClause = { roomId: tenant.roomId };
    }

    const bills = await prisma.bill.findMany({
      where: whereClause,
      include: {
        room: { select: { number: true, property: { select: { name: true } } } },
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
