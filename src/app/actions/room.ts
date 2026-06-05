"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateRoomMVP(formData: FormData) {
  const roomId = formData.get("roomId") as string;
  // NOTE: Use "AVAILABLE" instead of "VACANT" to match our existing database schema
  const status = formData.get("status") as "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";
  const waterMeterStart = parseFloat(formData.get("waterMeterStart") as string) || 0;
  const electricMeterStart = parseFloat(formData.get("electricMeterStart") as string) || 0;
  
  // Extract amenities (checkboxes)
  const hasAircon = formData.get("hasAircon") === "on";
  const hasFan = formData.get("hasFan") === "on";
  const hasFurniture = formData.get("hasFurniture") === "on";

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
}
