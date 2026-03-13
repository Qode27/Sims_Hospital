import { AppError } from "../utils/appError.js";
import type { Prisma } from "@prisma/client";

export const assertBedAvailability = async (
  tx: Prisma.TransactionClient,
  roomId: number | null | undefined,
  bedId: number | null | undefined,
) => {
  if (!roomId || !bedId) {
    return null;
  }

  const bed = await tx.bed.findFirst({
    where: {
      id: bedId,
      roomId,
      active: true,
    },
    include: {
      room: true,
    },
  });

  if (!bed) {
    throw new AppError("Selected bed was not found in the specified room", 400);
  }

  if (bed.status !== "AVAILABLE" && bed.status !== "RESERVED") {
    throw new AppError("Selected bed is not currently available", 400);
  }

  return bed;
};

export const setBedOccupancy = async (
  tx: Prisma.TransactionClient,
  bedId: number | null | undefined,
  status: "AVAILABLE" | "OCCUPIED",
) => {
  if (!bedId) {
    return;
  }

  await tx.bed.update({
    where: { id: bedId },
    data: { status },
  });
};
