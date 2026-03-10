import dayjs from "dayjs";

export const generateMrn = () => {
  const ts = dayjs().format("YYYYMMDDHHmmss");
  const rand = Math.floor(100 + Math.random() * 900);
  return `MRN-${ts}-${rand}`;
};

export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
