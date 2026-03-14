type InvoiceItemLike = {
  category?: string;
  amount?: number;
  total?: number;
  unitPrice?: number;
  qty?: number;
};

export const BILLING_CHARGE_FIELDS = [
  { key: "consultationFee", label: "Consultation Fee", category: "CONSULTATION" },
  { key: "procedureCharges", label: "Procedure Charges", category: "PROCEDURE" },
  { key: "medicineCharges", label: "Medicine Charges", category: "MEDICINE" },
  { key: "labCharges", label: "Lab Charges", category: "LAB" },
] as const;

export type BillingChargeKey = (typeof BILLING_CHARGE_FIELDS)[number]["key"];

export type BillingChargeState = Record<BillingChargeKey, string>;

export const emptyBillingCharges = (): BillingChargeState => ({
  consultationFee: "0",
  procedureCharges: "0",
  medicineCharges: "0",
  labCharges: "0",
});

export const parseChargeValue = (value: string) => Number(value || 0);

export const sumBillingCharges = (charges: BillingChargeState) =>
  BILLING_CHARGE_FIELDS.reduce((sum, field) => sum + parseChargeValue(charges[field.key]), 0);

export const chargesToInvoiceItems = (charges: BillingChargeState) =>
  BILLING_CHARGE_FIELDS
    .map((field) => ({
      category: field.category,
      name: field.label,
      qty: 1,
      unitPrice: parseChargeValue(charges[field.key]),
    }))
    .filter((item) => item.unitPrice > 0);

export const aggregateInvoiceCharges = (items: InvoiceItemLike[]) => {
  const lookup = {
    consultationFee: 0,
    procedureCharges: 0,
    medicineCharges: 0,
    labCharges: 0,
  };

  for (const item of items) {
    const fallbackAmount = Number(item.unitPrice ?? 0) * Number(item.qty ?? 1);
    const amount = Number(item.amount ?? item.total ?? fallbackAmount);
    switch (item.category) {
      case "CONSULTATION":
        lookup.consultationFee += amount;
        break;
      case "PROCEDURE":
        lookup.procedureCharges += amount;
        break;
      case "MEDICINE":
        lookup.medicineCharges += amount;
        break;
      case "LAB":
        lookup.labCharges += amount;
        break;
      default:
        lookup.procedureCharges += amount;
    }
  }

  return lookup;
};
