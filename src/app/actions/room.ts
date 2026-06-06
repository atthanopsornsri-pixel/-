"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function updateRoomMVP(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "OWNER" && session.user.role !== "ADMIN")) {
      throw new Error("Unauthorized");
    }

    const roomId = formData.get("roomId") as string;
    // NOTE: Use "AVAILABLE" instead of "VACANT" to match our existing database schema
    const status = formData.get("status") as "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";
    const waterMeterStart = parseFloat(formData.get("waterMeterStart") as string) || 0;
    const electricMeterStart = parseFloat(formData.get("electricMeterStart") as string) || 0;
    
    // Extract amenities (checkboxes)
    const hasAircon = formData.get("hasAircon") === "on";
    const hasFan = formData.get("hasFan") === "on";
    const hasFurniture = formData.get("hasFurniture") === "on";

    // Verify ownership of the room
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { property: true }
    });

    if (!room) throw new Error("Room not found");

    if (session.user.role === "OWNER" && room.property.ownerId !== session.user.id) {
      throw new Error("Unauthorized: You do not own this property");
    }

    await prisma.room.update({
      where: { id: roomId },
      data: {
        status: status,
        waterMeterStart: waterMeterStart,
        electricMeterStart: electricMeterStart,
        hasAircon: hasAircon,
        hasFan: hasFan,
        hasFurniture: hasFurniture,
      }
    });

    revalidatePath('/dashboard/rooms');
  } catch (error) {
    console.error("updateRoomMVP error:", error);
    throw error;
  }
}
