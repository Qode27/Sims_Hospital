import dayjs from "dayjs";
import { prisma } from "../db/prisma.js";
import { getOrSetCache } from "../utils/memoryCache.js";

const toAmount = (value: unknown) => Number(value ?? 0);

export const getDashboardSnapshot = async (date = dayjs().format("YYYY-MM-DD")) => {
  return getOrSetCache(`dashboard:${date}`, 30_000, async () => {
    const start = dayjs(date).startOf("day").toDate();
    const end = dayjs(date).endOf("day").toDate();

    const [opdPatients, ipdAdmissions, doctorsAvailable, appointments, revenueAggregate, occupiedBeds, totalBeds] =
      await Promise.all([
        prisma.visit.count({ where: { type: "OPD", scheduledAt: { gte: start, lte: end } } }),
        prisma.iPDAdmission.count({ where: { admittedAt: { lte: end }, OR: [{ dischargedAt: null }, { dischargedAt: { gte: start } }] } }),
        prisma.user.count({ where: { role: "DOCTOR", active: true } }),
        prisma.visit.count({ where: { scheduledAt: { gte: start, lte: end } } }),
        prisma.invoice.aggregate({ _sum: { paidAmount: true }, where: { createdAt: { gte: start, lte: end } } }),
        prisma.bed.count({ where: { status: "OCCUPIED", active: true } }),
        prisma.bed.count({ where: { active: true } }),
      ]);

    const revenue = toAmount(revenueAggregate._sum.paidAmount);
    const bedOccupancyRate = totalBeds > 0 ? Number(((occupiedBeds / totalBeds) * 100).toFixed(2)) : 0;

    const recentCollections = await prisma.invoice.findMany({
      where: { createdAt: { gte: start, lte: end } },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        patient: { select: { id: true, name: true, mrn: true } },
        doctor: { select: { id: true, name: true } },
      },
    });

    return {
      date,
      widgets: {
        todayOpdPatients: opdPatients,
        currentIpdAdmissions: ipdAdmissions,
        todayRevenue: revenue,
        doctorsAvailable,
        appointments,
        bedOccupancyRate,
      },
      recentCollections,
    };
  });
};

export const getOperationalReports = async (date = dayjs().format("YYYY-MM-DD")) => {
  return getOrSetCache(`reports:${date}`, 30_000, async () => {
    const start = dayjs(date).startOf("day").toDate();
    const end = dayjs(date).endOf("day").toDate();
    const monthStart = dayjs(date).startOf("month").toDate();

    const [
      opdCount,
      ipdCount,
      dailyRevenue,
      monthlyRevenue,
      doctorWise,
      bedOccupancy,
      paymentMix,
    ] = await Promise.all([
      prisma.visit.count({ where: { type: "OPD", scheduledAt: { gte: start, lte: end } } }),
      prisma.iPDAdmission.count({ where: { admittedAt: { gte: start, lte: end } } }),
      prisma.invoice.aggregate({ _sum: { paidAmount: true }, where: { createdAt: { gte: start, lte: end } } }),
      prisma.invoice.aggregate({ _sum: { paidAmount: true }, where: { createdAt: { gte: monthStart, lte: end } } }),
      prisma.visit.groupBy({
        by: ["doctorId"],
        where: { scheduledAt: { gte: start, lte: end } },
        _count: { id: true },
      }),
      prisma.bed.groupBy({
        by: ["status"],
        where: { active: true },
        _count: { id: true },
      }),
      prisma.payment.groupBy({
        by: ["paymentMode"],
        where: { receivedAt: { gte: start, lte: end } },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    const doctorIds = doctorWise.map((row) => row.doctorId);
    const doctors = doctorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: doctorIds } },
          select: {
            id: true,
            name: true,
            doctorProfile: { select: { specialization: true } },
          },
        })
      : [];

    const doctorMap = new Map(doctors.map((doctor) => [doctor.id, doctor]));

    return {
      date,
      summary: {
        dailyOpd: opdCount,
        dailyIpd: ipdCount,
        dailyRevenue: toAmount(dailyRevenue._sum.paidAmount),
        monthlyRevenue: toAmount(monthlyRevenue._sum.paidAmount),
      },
      doctorWisePatients: doctorWise
        .map((row) => ({
          doctorId: row.doctorId,
          doctorName: doctorMap.get(row.doctorId)?.name ?? `Doctor #${row.doctorId}`,
          specialization: doctorMap.get(row.doctorId)?.doctorProfile?.specialization ?? null,
          patientCount: row._count.id,
        }))
        .sort((a, b) => b.patientCount - a.patientCount),
      bedOccupancy: bedOccupancy.map((row) => ({
        status: row.status,
        count: row._count.id,
      })),
      paymentMix: paymentMix.map((row) => ({
        paymentMode: row.paymentMode,
        payments: row._count.id,
        amount: toAmount(row._sum.amount),
      })),
    };
  });
};
