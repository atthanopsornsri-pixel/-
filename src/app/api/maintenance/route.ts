import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "TENANT") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { title, description, imageUrl } = await req.json();

    if (!title || !description) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Get tenant's room
    const tenant = await prisma.tenant.findUnique({
      where: { userId: session.user.id },
    });

    if (!tenant || !tenant.roomId) {
      return NextResponse.json({ message: "You don't have an assigned room" }, { status: 400 });
    }

    const request = await prisma.maintenanceRequest.create({
      data: {
        roomId: tenant.roomId,
        title,
        description,
        imageUrl,
      },
    });

    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    console.error("Error creating maintenance request:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let requests;

    if (session.user.role === "TENANT") {
      const tenant = await prisma.tenant.findUnique({
        where: { userId: session.user.id },
      });
      
      if (!tenant?.roomId) return NextResponse.json([]);

      requests = await prisma.maintenanceRequest.findMany({
        where: { roomId: tenant.roomId },
        orderBy: { createdAt: "desc" },
      });
    } else if (session.user.role === "OWNER") {
      const { searchParams } = new URL(req.url);
      const propertyId = searchParams.get("propertyId");

      let whereClause: any = {
        room: { property: { ownerId: session.user.id } },
      };
      if (propertyId) {
        whereClause.room.propertyId = propertyId;
      }

      requests = await prisma.maintenanceRequest.findMany({
        where: whereClause,
        include: {
          room: { select: { number: true, property: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(requests);
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id, status } = await req.json();

    // Verify ownership of the maintenance request room's property
    const maintReq = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: {
        room: {
          include: { property: true }
        }
      }
    });

    if (!maintReq) {
      return NextResponse.json({ message: "Maintenance request not found" }, { status: 404 });
    }

    if (maintReq.room.property.ownerId !== session.user.id) {
      return NextResponse.json({ message: "Unauthorized: You do not own this property" }, { status: 403 });
    }

    const request = await prisma.maintenanceRequest.update({
      where: { id },
      data: { status },
      include: {
        room: { select: { number: true } }
      }
    });

    // Notify Tenant if they have Line Token setup
    const tenant = await prisma.tenant.findFirst({
      where: { roomId: request.roomId },
      include: { user: { select: { lineToken: true } } }
    });

    if (tenant?.user?.lineToken) {
      const statusText = status === "IN_PROGRESS" ? "กำลังดำเนินการแก้ไข 👨‍🔧" : "แก้ไขเสร็จสิ้นเรียบร้อยแล้ว ✅";
      import('@/lib/line').then(({ sendLineNotify }) => {
        sendLineNotify(
          tenant.user.lineToken!,
          `🛠️ อัปเดตสถานะแจ้งซ่อม!\nห้อง: ${request.room.number}\nเรื่อง: ${request.title}\nสถานะ: ${statusText}`
        );
      });
    }

    return NextResponse.json(request);
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
