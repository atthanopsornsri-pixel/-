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
             if (operation === 'create' || operation === 'createMany') {
                if (anyArgs.data && !Array.isArray(anyArgs.data) && anyArgs.data.roomId !== roomId) {
                   throw new Error("Forbidden: Cannot create request for another room");
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
        }
      }
    });
  }

  throw new Error("Forbidden: Invalid Role");
}
