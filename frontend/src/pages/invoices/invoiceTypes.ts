import type { Invoice, Visit } from "../../types";

export type VisitOption = Pick<Visit, "id" | "type" | "scheduledAt" | "consultationFee" | "patient" | "doctor" | "invoice">;

export type PaymentMode = "CASH" | "UPI" | "CARD" | "INSURANCE";

export type PaymentFormState = {
  paymentMode: PaymentMode;
  amount: string;
  referenceNo: string;
};

export type BillingErrors = {
  visitId: string;
  charges: string;
  paymentAmount: string;
};

export type InvoiceListItem = Invoice;
