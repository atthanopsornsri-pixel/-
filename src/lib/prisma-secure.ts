import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// 1. Base Prisma with Soft Delete system-wide
const softDeletePrisma = prisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const softDeleteModels = ['Property', 'Room', 'Tenant', 'Bill', 'Parcel', 'MaintenanceRequest'];
        if (!model || !softDeleteModels.includes(model)) {
          return query(args);
        }

        const anyArgs = args as any;
        const operationsWithWhere = ['findMany', 'findFirst', 'count', 'findUnique', 'findUniqueOrThrow', 'update', 'updateMany', 'delete', 'deleteMany'];
        
        if (operationsWithWhere.includes(operation)) {
          anyArgs.where = anyArgs.where || {};
          // Hide soft-deleted records from reads
          if (['findMany', 'findFirst', 'count', 'findUnique', 'findUniqueOrThrow'].includes(operation)) {
            anyArgs.where.isDeleted = false;
          }
        }

        // Mutate Hard Delete into Soft Delete
        if (operation === 'delete') {
          return (prisma as any)[model.charAt(0).toLowerCase() + model.slice(1)].update({
            ...anyArgs,
            data: { isDeleted: true },
          });
        }
        if (operation === 'deleteMany') {
          return (prisma as any)[model.charAt(0).toLowerCase() + model.slice(1)].updateMany({
            ...anyArgs,
            data: { isDeleted: true },
          });
        }

        return query(anyArgs);
      }
    }
  }
});

export async function getSecurePrisma() {
  const session = await getServerSession(authOptions);

  if (!session) {
    throw new Error("Unauthorized: No session found");
  }

  // ADMIN bypasses RLS, but still uses Soft Delete
  if (session.user.role === "ADMIN") return softDeletePrisma;

  // OWNER Policy
  if (session.user.role === "OWNER") {
    const ownerId = session.user.id;

    const verifyPropertyOwner = async (propertyId: string) => {
      const property = await softDeletePrisma.property.findFirst({
        where: { id: propertyId, ownerId }
      });
      if (!property) throw new Error("Forbidden: Property does not belong to owner");
    };

    const verifyRoomOwner = async (roomId: string) => {
      const room = await softDeletePrisma.room.findFirst({
        where: { id: roomId, property: { ownerId } }
      });
      if (!room) throw new Error("Forbidden: Room does not belong to owner's properties");
    };

    const verifyTenantOwner = async (tenantId: string) => {
      const tenant = await softDeletePrisma.tenant.findFirst({
        where: { id: tenantId, room: { property: { ownerId } } }
      });
      if (!tenant) throw new Error("Forbidden: Tenant does not belong to owner's properties");
    };

    return softDeletePrisma.$extends({
      query: {
        property: {
          async $allOperations({ operation, args, query }) {
            const anyArgs = args as any;
            if (['findMany', 'findFirst', 'update', 'updateMany', 'delete', 'deleteMany', 'count'].includes(operation)) {
              anyArgs.where = { ...anyArgs.where, ownerId };
            }
            if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
                const result = await softDeletePrisma.property.findFirst({ ...anyArgs, where: { ...anyArgs.where, ownerId } });
                if (operation === 'findUniqueOrThrow' && !result) throw new Error("Not Found");
                return result as any;
            }
            if (operation === 'create') {
              anyArgs.data = anyArgs.data || {};
              anyArgs.data.ownerId = ownerId;
            }
            if (operation === 'createMany') {
              const data = anyArgs.data;
              if (Array.isArray(data)) {
                for (const item of data) item.ownerId = ownerId;
              } else if (data) {
                data.ownerId = ownerId;
              }
            }
            if (operation === 'update' || operation === 'upsert') {
              if (anyArgs.data) {
                anyArgs.data.ownerId = ownerId;
              }
            }
            return query(args);
          }
        },
        room: {
          async $allOperations({ operation, args, query }) {
            const anyArgs = args as any;
            if (['findMany', 'findFirst', 'update', 'updateMany', 'delete', 'deleteMany', 'count'].includes(operation)) {
              anyArgs.where = { ...anyArgs.where, property: { ownerId } };
            }
            if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
                const result = await softDeletePrisma.room.findFirst({ ...anyArgs, where: { ...anyArgs.where, property: { ownerId } } });
                if (operation === 'findUniqueOrThrow' && !result) throw new Error("Not Found");
                return result as any;
            }
            if (operation === 'create') {
              const propertyId = anyArgs.data?.propertyId;
              if (propertyId) await verifyPropertyOwner(propertyId);
            }
            if (operation === 'createMany') {
              const data = anyArgs.data;
              const items = Array.isArray(data) ? data : (data ? [data] : []);
              for (const item of items) {
                if (item.propertyId) await verifyPropertyOwner(item.propertyId);
              }
            }
            if (operation === 'update' || operation === 'upsert') {
              const propertyId = anyArgs.data?.propertyId;
              if (propertyId) await verifyPropertyOwner(propertyId);
            }
            return query(args);
          }
        },
        tenant: {
          async $allOperations({ operation, args, query }) {
            const anyArgs = args as any;
            if (['findMany', 'findFirst', 'update', 'updateMany', 'delete', 'deleteMany', 'count'].includes(operation)) {
              anyArgs.where = { ...anyArgs.where, room: { property: { ownerId } } };
            }
            if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
                const result = await softDeletePrisma.tenant.findFirst({ ...anyArgs, where: { ...anyArgs.where, room: { property: { ownerId } } } });
                if (operation === 'findUniqueOrThrow' && !result) throw new Error("Not Found");
                return result as any;
            }
            if (operation === 'create') {
              const roomId = anyArgs.data?.roomId;
              if (roomId) await verifyRoomOwner(roomId);
            }
            if (operation === 'createMany') {
              const data = anyArgs.data;
              const items = Array.isArray(data) ? data : (data ? [data] : []);
              for (const item of items) {
                if (item.roomId) await verifyRoomOwner(item.roomId);
              }
            }
            if (operation === 'update' || operation === 'upsert') {
              const roomId = anyArgs.data?.roomId;
              if (roomId) await verifyRoomOwner(roomId);
            }
            return query(args);
          }
        },
        bill: {
          async $allOperations({ operation, args, query }) {
            const anyArgs = args as any;
            if (['findMany', 'findFirst', 'update', 'updateMany', 'delete', 'deleteMany', 'count'].includes(operation)) {
              anyArgs.where = { ...anyArgs.where, room: { property: { ownerId } } };
            }
            if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
                const result = await softDeletePrisma.bill.findFirst({ ...anyArgs, where: { ...anyArgs.where, room: { property: { ownerId } } } });
                if (operation === 'findUniqueOrThrow' && !result) throw new Error("Not Found");
                return result as any;
            }
            if (operation === 'create') {
              const roomId = anyArgs.data?.roomId;
              if (roomId) await verifyRoomOwner(roomId);
            }
            if (operation === 'createMany') {
              const data = anyArgs.data;
              const items = Array.isArray(data) ? data : (data ? [data] : []);
              for (const item of items) {
                if (item.roomId) await verifyRoomOwner(item.roomId);
              }
            }
            if (operation === 'update' || operation === 'upsert') {
              const roomId = anyArgs.data?.roomId;
              if (roomId) await verifyRoomOwner(roomId);
            }
            return query(args);
          }
        },
        maintenanceRequest: {
          async $allOperations({ operation, args, query }) {
            const anyArgs = args as any;
            if (['findMany', 'findFirst', 'update', 'updateMany', 'delete', 'deleteMany', 'count'].includes(operation)) {
              anyArgs.where = { ...anyArgs.where, room: { property: { ownerId } } };
            }
            if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
                const result = await softDeletePrisma.maintenanceRequest.findFirst({ ...anyArgs, where: { ...anyArgs.where, room: { property: { ownerId } } } });
                if (operation === 'findUniqueOrThrow' && !result) throw new Error("Not Found");
                return result as any;
            }
            if (operation === 'create') {
              const roomId = anyArgs.data?.roomId;
              if (roomId) await verifyRoomOwner(roomId);
            }
            if (operation === 'createMany') {
              const data = anyArgs.data;
              const items = Array.isArray(data) ? data : (data ? [data] : []);
              for (const item of items) {
                if (item.roomId) await verifyRoomOwner(item.roomId);
              }
            }
            if (operation === 'update' || operation === 'upsert') {
              const roomId = anyArgs.data?.roomId;
              if (roomId) await verifyRoomOwner(roomId);
            }
            return query(args);
          }
        },
        parcel: {
          async $allOperations({ operation, args, query }) {
            const anyArgs = args as any;
            if (['findMany', 'findFirst', 'update', 'updateMany', 'delete', 'deleteMany', 'count'].includes(operation)) {
              anyArgs.where = { ...anyArgs.where, room: { property: { ownerId } } };
            }
            if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
                const result = await softDeletePrisma.parcel.findFirst({ ...anyArgs, where: { ...anyArgs.where, room: { property: { ownerId } } } });
                if (operation === 'findUniqueOrThrow' && !result) throw new Error("Not Found");
                return result as any;
            }
            if (operation === 'create') {
              const roomId = anyArgs.data?.roomId;
              if (roomId) await verifyRoomOwner(roomId);
            }
            if (operation === 'createMany') {
              const data = anyArgs.data;
              const items = Array.isArray(data) ? data : (data ? [data] : []);
              for (const item of items) {
                if (item.roomId) await verifyRoomOwner(item.roomId);
              }
            }
            if (operation === 'update' || operation === 'upsert') {
              const roomId = anyArgs.data?.roomId;
              if (roomId) await verifyRoomOwner(roomId);
            }
            return query(args);
          }
        },
        vehicle: {
          async $allOperations({ operation, args, query }) {
            const anyArgs = args as any;
            if (['findMany', 'findFirst', 'update', 'updateMany', 'delete', 'deleteMany', 'count'].includes(operation)) {
              anyArgs.where = { ...anyArgs.where, tenant: { room: { property: { ownerId } } } };
            }
            if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
                const result = await softDeletePrisma.vehicle.findFirst({ ...anyArgs, where: { ...anyArgs.where, tenant: { room: { property: { ownerId } } } } });
                if (operation === 'findUniqueOrThrow' && !result) throw new Error("Not Found");
                return result as any;
            }
            if (operation === 'create') {
              const tenantId = anyArgs.data?.tenantId;
              if (tenantId) await verifyTenantOwner(tenantId);
            }
            if (operation === 'createMany') {
              const data = anyArgs.data;
              const items = Array.isArray(data) ? data : (data ? [data] : []);
              for (const item of items) {
                if (item.tenantId) await verifyTenantOwner(item.tenantId);
              }
            }
            if (operation === 'update' || operation === 'upsert') {
              const tenantId = anyArgs.data?.tenantId;
              if (tenantId) await verifyTenantOwner(tenantId);
            }
            return query(args);
          }
        },
        meterSubmission: {
          async $allOperations({ operation, args, query }) {
            const anyArgs = args as any;
            if (['findMany', 'findFirst', 'update', 'updateMany', 'delete', 'deleteMany', 'count'].includes(operation)) {
              anyArgs.where = { ...anyArgs.where, room: { property: { ownerId } } };
            }
            if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
                const result = await softDeletePrisma.meterSubmission.findFirst({ ...anyArgs, where: { ...anyArgs.where, room: { property: { ownerId } } } });
                if (operation === 'findUniqueOrThrow' && !result) throw new Error("Not Found");
                return result as any;
            }
            if (operation === 'create') {
              const roomId = anyArgs.data?.roomId;
              if (roomId) await verifyRoomOwner(roomId);
            }
            if (operation === 'createMany') {
              const data = anyArgs.data;
              const items = Array.isArray(data) ? data : (data ? [data] : []);
              for (const item of items) {
                if (item.roomId) await verifyRoomOwner(item.roomId);
              }
            }
            if (operation === 'update' || operation === 'upsert') {
              const roomId = anyArgs.data?.roomId;
              if (roomId) await verifyRoomOwner(roomId);
            }
            return query(args);
          }
        }
      }
    });
  }

  // STAFF Policy — พนักงานคุมตึก: scope ด้วย propertyId ที่ได้รับมอบหมาย (แทน ownerId)
  // property = read-only (สร้าง/แก้ตึก + ตั้งค่า owner-only); ที่เหลือจัดการงานประจำวันได้ (scoped)
  // assignedPropertyIds ว่าง → { in: [] } = ไม่เห็น/แตะอะไรเลย (deny-all by default)
  if (session.user.role === "STAFF") {
    const assignedPropertyIds = session.user.assignedPropertyIds ?? [];
    const roomScope = { propertyId: { in: assignedPropertyIds } };
    const nestedRoomScope = { room: { propertyId: { in: assignedPropertyIds } } };

    return softDeletePrisma.$extends({
      query: {
        property: {
          async $allOperations({ operation, args, query }) {
            const anyArgs = args as any;
            if (!['findMany', 'findFirst', 'findUnique', 'findUniqueOrThrow', 'count'].includes(operation)) {
              throw new Error(`Forbidden: STAFF cannot execute ${operation} on property`);
            }
            if (['findMany', 'findFirst', 'count'].includes(operation)) {
              anyArgs.where = { ...anyArgs.where, id: { in: assignedPropertyIds } };
            }
            if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
              const result = await softDeletePrisma.property.findFirst({ ...anyArgs, where: { ...anyArgs.where, id: { in: assignedPropertyIds } } });
              if (operation === 'findUniqueOrThrow' && !result) throw new Error("Not Found");
              return result as any;
            }
            return query(args);
          }
        },
        room: {
          async $allOperations({ operation, args, query }) {
            const anyArgs = args as any;
            if (['findMany', 'findFirst', 'update', 'updateMany', 'delete', 'deleteMany', 'count'].includes(operation)) {
              anyArgs.where = { ...anyArgs.where, ...roomScope };
            }
            if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
              const result = await softDeletePrisma.room.findFirst({ ...anyArgs, where: { ...anyArgs.where, ...roomScope } });
              if (operation === 'findUniqueOrThrow' && !result) throw new Error("Not Found");
              return result as any;
            }
            return query(args);
          }
        },
        tenant: {
          async $allOperations({ operation, args, query }) {
            const anyArgs = args as any;
            if (['findMany', 'findFirst', 'update', 'updateMany', 'delete', 'deleteMany', 'count'].includes(operation)) {
              anyArgs.where = { ...anyArgs.where, ...nestedRoomScope };
            }
            if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
              const result = await softDeletePrisma.tenant.findFirst({ ...anyArgs, where: { ...anyArgs.where, ...nestedRoomScope } });
              if (operation === 'findUniqueOrThrow' && !result) throw new Error("Not Found");
              return result as any;
            }
            return query(args);
          }
        },
        bill: {
          async $allOperations({ operation, args, query }) {
            const anyArgs = args as any;
            if (['findMany', 'findFirst', 'update', 'updateMany', 'delete', 'deleteMany', 'count'].includes(operation)) {
              anyArgs.where = { ...anyArgs.where, ...nestedRoomScope };
            }
            if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
              const result = await softDeletePrisma.bill.findFirst({ ...anyArgs, where: { ...anyArgs.where, ...nestedRoomScope } });
              if (operation === 'findUniqueOrThrow' && !result) throw new Error("Not Found");
              return result as any;
            }
            return query(args);
          }
        },
        maintenanceRequest: {
          async $allOperations({ operation, args, query }) {
            const anyArgs = args as any;
            if (['findMany', 'findFirst', 'update', 'updateMany', 'delete', 'deleteMany', 'count'].includes(operation)) {
              anyArgs.where = { ...anyArgs.where, ...nestedRoomScope };
            }
            if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
              const result = await softDeletePrisma.maintenanceRequest.findFirst({ ...anyArgs, where: { ...anyArgs.where, ...nestedRoomScope } });
              if (operation === 'findUniqueOrThrow' && !result) throw new Error("Not Found");
              return result as any;
            }
            return query(args);
          }
        },
        parcel: {
          async $allOperations({ operation, args, query }) {
            const anyArgs = args as any;
            if (['findMany', 'findFirst', 'update', 'updateMany', 'delete', 'deleteMany', 'count'].includes(operation)) {
              anyArgs.where = { ...anyArgs.where, ...nestedRoomScope };
            }
            if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
              const result = await softDeletePrisma.parcel.findFirst({ ...anyArgs, where: { ...anyArgs.where, ...nestedRoomScope } });
              if (operation === 'findUniqueOrThrow' && !result) throw new Error("Not Found");
              return result as any;
            }
            return query(args);
          }
        }
      }
    });
  }

  // TENANT Policy
  if (session.user.role === "TENANT") {
    const userId = session.user.id;
    // We must use the base prisma here to fetch the tenant profile initially
    const tenantRecord = await softDeletePrisma.tenant.findUnique({
      where: { userId },
      include: { room: true }
    });
    
    if (!tenantRecord || !tenantRecord.roomId || !tenantRecord.room) {
      throw new Error("Forbidden: Tenant profile or room not found");
    }
    
    const roomId = tenantRecord.roomId;
    const tenantId = tenantRecord.id;
    const propertyId = tenantRecord.room.propertyId;

    return softDeletePrisma.$extends({
      query: {
        property: {
          async $allOperations({ operation, args, query }) {
             const anyArgs = args as any;
             if (!['findMany', 'findFirst', 'findUnique', 'count'].includes(operation)) {
              throw new Error(`Forbidden: TENANT cannot execute ${operation} on property`);
             }
             if (['findMany', 'findFirst', 'count'].includes(operation)) {
                anyArgs.where = { ...anyArgs.where, id: propertyId };
             }
             if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
                 const result = await softDeletePrisma.property.findFirst({ ...anyArgs, where: { ...anyArgs.where, id: propertyId } });
                 if (operation === 'findUniqueOrThrow' && !result) throw new Error("Not Found");
                 return result as any;
             }
             return query(args);
          }
        },
        bill: {
          async $allOperations({ operation, args, query }) {
            const anyArgs = args as any;
            if (!['findMany', 'findFirst', 'findUnique', 'count'].includes(operation)) {
              throw new Error(`Forbidden: TENANT cannot execute ${operation} on bills`);
            }
            if (['findMany', 'findFirst', 'count'].includes(operation)) {
              anyArgs.where = { ...anyArgs.where, roomId };
            }
            if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
                const result = await softDeletePrisma.bill.findFirst({ ...anyArgs, where: { ...anyArgs.where, roomId } });
                if (operation === 'findUniqueOrThrow' && !result) throw new Error("Not Found");
                return result as any;
            }
            return query(args);
          }
        },
        maintenanceRequest: {
          async $allOperations({ operation, args, query }) {
             const anyArgs = args as any;
             if (['findMany', 'findFirst', 'update', 'updateMany', 'delete', 'deleteMany', 'count'].includes(operation)) {
                anyArgs.where = { ...anyArgs.where, roomId };
             }
             if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
                 const result = await softDeletePrisma.maintenanceRequest.findFirst({ ...anyArgs, where: { ...anyArgs.where, roomId } });
                 if (operation === 'findUniqueOrThrow' && !result) throw new Error("Not Found");
                 return result as any;
             }
             if (operation === 'create') {
                const dataRoomId = anyArgs.data?.roomId;
                if (dataRoomId && dataRoomId !== roomId) {
                   throw new Error("Forbidden: Cannot create request for another room");
                }
                anyArgs.data = anyArgs.data || {};
                anyArgs.data.roomId = roomId;
             }
             if (operation === 'createMany') {
                const data = anyArgs.data;
                const items = Array.isArray(data) ? data : (data ? [data] : []);
                for (const item of items) {
                   if (item.roomId && item.roomId !== roomId) {
                      throw new Error("Forbidden: Cannot create request for another room");
                   }
                   item.roomId = roomId;
                }
             }
             if (operation === 'update' || operation === 'upsert') {
                if (anyArgs.data) {
                   const dataRoomId = anyArgs.data?.roomId;
                   if (dataRoomId && dataRoomId !== roomId) {
                      throw new Error("Forbidden: Cannot update request for another room");
                   }
                   anyArgs.data.roomId = roomId;
                }
             }
             return query(args);
          }
        },
        parcel: {
          async $allOperations({ operation, args, query }) {
             const anyArgs = args as any;
             if (!['findMany', 'findFirst', 'findUnique', 'count'].includes(operation)) {
              throw new Error(`Forbidden: TENANT cannot execute ${operation} on parcels`);
             }
             if (['findMany', 'findFirst', 'count'].includes(operation)) {
                anyArgs.where = { ...anyArgs.where, roomId };
             }
             if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
                 const result = await softDeletePrisma.parcel.findFirst({ ...anyArgs, where: { ...anyArgs.where, roomId } });
                 if (operation === 'findUniqueOrThrow' && !result) throw new Error("Not Found");
                 return result as any;
             }
             return query(args);
          }
        },
        room: {
          async $allOperations({ operation, args, query }) {
             const anyArgs = args as any;
             if (!['findMany', 'findFirst', 'findUnique', 'count'].includes(operation)) {
              throw new Error(`Forbidden: TENANT cannot execute ${operation} on room`);
             }
             if (['findMany', 'findFirst', 'count'].includes(operation)) {
                anyArgs.where = { ...anyArgs.where, id: roomId };
             }
             if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
                 const result = await softDeletePrisma.room.findFirst({ ...anyArgs, where: { ...anyArgs.where, id: roomId } });
                 if (operation === 'findUniqueOrThrow' && !result) throw new Error("Not Found");
                 return result as any;
             }
             return query(args);
          }
        },
        vehicle: {
          async $allOperations({ operation, args, query }) {
             const anyArgs = args as any;
             if (['findMany', 'findFirst', 'update', 'updateMany', 'delete', 'deleteMany', 'count'].includes(operation)) {
                anyArgs.where = { ...anyArgs.where, tenantId };
             }
             if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
                 const result = await softDeletePrisma.vehicle.findFirst({ ...anyArgs, where: { ...anyArgs.where, tenantId } });
                 if (operation === 'findUniqueOrThrow' && !result) throw new Error("Not Found");
                 return result as any;
             }
             if (operation === 'create') {
                const dataTenantId = anyArgs.data?.tenantId;
                if (dataTenantId && dataTenantId !== tenantId) {
                   throw new Error("Forbidden: Cannot create vehicle for another tenant");
                }
                anyArgs.data = anyArgs.data || {};
                anyArgs.data.tenantId = tenantId;
             }
             if (operation === 'createMany') {
                const data = anyArgs.data;
                const items = Array.isArray(data) ? data : (data ? [data] : []);
                for (const item of items) {
                   if (item.tenantId && item.tenantId !== tenantId) {
                      throw new Error("Forbidden: Cannot create vehicle for another tenant");
                   }
                   item.tenantId = tenantId;
                }
             }
             if (operation === 'update' || operation === 'upsert') {
                if (anyArgs.data) {
                   const dataTenantId = anyArgs.data?.tenantId;
                   if (dataTenantId && dataTenantId !== tenantId) {
                      throw new Error("Forbidden: Cannot update vehicle for another tenant");
                   }
                   anyArgs.data.tenantId = tenantId;
                }
             }
             return query(args);
          }
        },
        meterSubmission: {
          async $allOperations({ operation, args, query }) {
             const anyArgs = args as any;
             if (['findMany', 'findFirst', 'count'].includes(operation)) {
                anyArgs.where = { ...anyArgs.where, roomId };
             }
             if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
                 const result = await softDeletePrisma.meterSubmission.findFirst({ ...anyArgs, where: { ...anyArgs.where, roomId } });
                 if (operation === 'findUniqueOrThrow' && !result) throw new Error("Not Found");
                 return result as any;
             }
             if (operation === 'create') {
                const dataRoomId = anyArgs.data?.roomId;
                const dataTenantId = anyArgs.data?.tenantId;
                if (dataRoomId && dataRoomId !== roomId) {
                   throw new Error("Forbidden: Cannot submit meter for another room");
                }
                if (dataTenantId && dataTenantId !== tenantId) {
                   throw new Error("Forbidden: Cannot submit meter for another tenant");
                }
                anyArgs.data = anyArgs.data || {};
                anyArgs.data.roomId = roomId;
                anyArgs.data.tenantId = tenantId;
             }
             if (operation === 'createMany') {
                const data = anyArgs.data;
                const items = Array.isArray(data) ? data : (data ? [data] : []);
                for (const item of items) {
                   if (item.roomId && item.roomId !== roomId) {
                      throw new Error("Forbidden: Cannot submit meter for another room");
                   }
                   if (item.tenantId && item.tenantId !== tenantId) {
                      throw new Error("Forbidden: Cannot submit meter for another tenant");
                   }
                   item.roomId = roomId;
                   item.tenantId = tenantId;
                }
             }
             if (operation === 'update' || operation === 'upsert') {
                if (anyArgs.data) {
                   const dataRoomId = anyArgs.data?.roomId;
                   const dataTenantId = anyArgs.data?.tenantId;
                   if (dataRoomId && dataRoomId !== roomId) {
                      throw new Error("Forbidden: Cannot update meter for another room");
                   }
                   if (dataTenantId && dataTenantId !== tenantId) {
                      throw new Error("Forbidden: Cannot update meter for another tenant");
                   }
                   anyArgs.data.roomId = roomId;
                   anyArgs.data.tenantId = tenantId;
                }
             }
             return query(args);
          }
        }
      }
    });
  }

  throw new Error("Forbidden: Invalid Role");
}
