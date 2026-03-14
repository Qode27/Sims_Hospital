import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../api/client";
import { invoiceApi, visitApi } from "../../api/services";
import {
  chargesToInvoiceItems,
  emptyBillingCharges,
  sumBillingCharges,
  type BillingChargeState,
} from "../../utils/billing";
import type { BillingErrors, InvoiceListItem, PaymentFormState, VisitOption } from "./invoiceTypes";

const isNumeric = (value: string) => value === "" || /^\d*\.?\d*$/.test(value);

const emptyErrors: BillingErrors = {
  visitId: "",
  charges: "",
  paymentAmount: "",
};

export const blankPayment = (): PaymentFormState => ({
  paymentMode: "CASH",
  amount: "0",
  referenceNo: "",
});

export const useInvoices = (presetVisitId = "") => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState<number | null>(null);
  const [pageError, setPageError] = useState("");
  const [query, setQuery] = useState("");
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [visits, setVisits] = useState<VisitOption[]>([]);
  const [errors, setErrors] = useState<BillingErrors>(emptyErrors);
  const [visitId, setVisitId] = useState(presetVisitId);
  const [charges, setCharges] = useState<BillingChargeState>(emptyBillingCharges());
  const [payment, setPayment] = useState<PaymentFormState>(blankPayment());
  const [lastCreated, setLastCreated] = useState<{ invoiceId: number; visitId: number; dueAmount: number } | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<InvoiceListItem | null>(null);
  const [paymentDraft, setPaymentDraft] = useState<PaymentFormState>(blankPayment());

  const load = async (search = query) => {
    setLoading(true);
    setPageError("");
    try {
      const [invoiceRes, visitRes] = await Promise.all([
        invoiceApi.list({ page: 1, pageSize: 30, q: search }),
        visitApi.list({ page: 1, pageSize: 100 }),
      ]);
      setInvoices(invoiceRes.data.data);
      setVisits(visitRes.data.data.filter((visit) => !visit.invoice));
    } catch (error) {
      const message = getErrorMessage(error);
      setPageError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!presetVisitId) {
      return;
    }
    setVisitId(presetVisitId);
  }, [presetVisitId]);

  const selectedVisit = useMemo(
    () => visits.find((visit) => String(visit.id) === visitId) ?? null,
    [visitId, visits],
  );

  useEffect(() => {
    if (!selectedVisit) {
      return;
    }
    setCharges((prev) => ({
      ...prev,
      consultationFee:
        prev.consultationFee !== "0" && prev.consultationFee !== ""
          ? prev.consultationFee
          : String(selectedVisit.consultationFee || 0),
    }));
  }, [selectedVisit]);

  const totalAmount = useMemo(() => sumBillingCharges(charges), [charges]);

  const resetForm = () => {
    setVisitId("");
    setCharges(emptyBillingCharges());
    setPayment(blankPayment());
    setErrors(emptyErrors);
  };

  const validateForm = () => {
    const nextErrors = { ...emptyErrors };
    if (!visitId) {
      nextErrors.visitId = "Select a patient visit before generating the invoice.";
    }
    if (totalAmount <= 0) {
      nextErrors.charges = "Enter at least one charge amount greater than zero.";
    }
    if (!payment.amount || Number(payment.amount) <= 0) {
      nextErrors.paymentAmount = "Paid amount is required.";
    } else if (Number(payment.amount) > totalAmount) {
      nextErrors.paymentAmount = "Paid amount cannot exceed the total amount.";
    }
    setErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  };

  const handleChargeChange = (key: keyof BillingChargeState, value: string) => {
    if (!isNumeric(value)) {
      return;
    }
    setCharges((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const createInvoice = async () => {
    if (saving || !validateForm() || !selectedVisit) {
      return false;
    }

    setSaving(true);
    try {
      const created = await invoiceApi.create({
        visitId: Number(visitId),
        invoiceType: selectedVisit.type === "IPD" ? "IPD" : "OPD",
        items: chargesToInvoiceItems(charges),
        payments: [
          {
            paymentMode: payment.paymentMode,
            amount: Number(payment.amount),
            referenceNo: payment.referenceNo.trim() || undefined,
          },
        ],
      });

      toast.success("Invoice generated successfully");
      setLastCreated({
        invoiceId: created.data.data.id,
        visitId: created.data.data.visitId,
        dueAmount: Number(created.data.data.dueAmount || 0),
      });
      resetForm();
      await load();
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openPaymentModal = (invoice: InvoiceListItem) => {
    setPaymentTarget(invoice);
    setPaymentDraft(blankPayment());
  };

  const closePaymentModal = () => {
    setPaymentTarget(null);
    setPaymentDraft(blankPayment());
  };

  const savePayment = async () => {
    if (!paymentTarget || Number(paymentDraft.amount) <= 0 || paymentSaving === paymentTarget.id) {
      toast.error("Enter a valid payment amount.");
      return;
    }

    setPaymentSaving(paymentTarget.id);
    try {
      await invoiceApi.addPayments(paymentTarget.id, {
        payments: [
          {
            paymentMode: paymentDraft.paymentMode,
            amount: Number(paymentDraft.amount),
            referenceNo: paymentDraft.referenceNo.trim() || undefined,
          },
        ],
      });
      toast.success("Payment recorded");
      closePaymentModal();
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setPaymentSaving(null);
    }
  };

  return {
    loading,
    saving,
    paymentSaving,
    pageError,
    query,
    setQuery,
    invoices,
    visits,
    errors,
    visitId,
    setVisitId,
    charges,
    handleChargeChange,
    payment,
    setPayment,
    lastCreated,
    selectedVisit,
    totalAmount,
    load,
    createInvoice,
    resetForm,
    paymentTarget,
    paymentDraft,
    setPaymentDraft,
    openPaymentModal,
    closePaymentModal,
    savePayment,
    isNumeric,
  };
};
