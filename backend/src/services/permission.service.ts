import { prisma } from "../db/prisma.js";
import type { UserRoleValue } from "../types/domain.js";

export const getPermissionsForRole = async (role: UserRoleValue) => {
  const rows = await prisma.rolePermission.findMany({
    where: { role },
    include: {
      permission: {
        select: {
          code: true,
        },
      },
    },
  });

  return rows.map((row) => row.permission.code).sort();
};
