export const parsePage = (page: unknown, pageSize: unknown) => {
  const safePage = Math.max(1, Number(page ?? 1));
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize ?? 10)));
  const skip = (safePage - 1) * safePageSize;

  return { page: safePage, pageSize: safePageSize, skip, take: safePageSize };
};
