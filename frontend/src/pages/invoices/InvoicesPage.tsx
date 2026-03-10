import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useSearchParams } from "react-router-dom";
import { getErrorMessage } from "../../api/client";
import { invoiceApi, visitApi } from "../../api/services";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Loader } from "../../components/ui/Loader";
import { Select } from "../../components/ui/Select";
import { formatCurrency, formatDateTime } from "../../utils/format";

type VisitOption = {
  id: number;
  patient: { name: string; mrn: string };
  doctor: { name: string };
  consultationFee: number;
  invoice?: { id: number } | null;
};

type ItemForm = {
  category: "CONSULTATION" | "LAB" | "PROCEDURE" | "MEDICINE" | "MISC";
  name: string;
  qty: string;
  unitPrice: string;
  discount: string;
  tax: string;
};

const blankItem = (): ItemForm => ({
  category: "CONSULTATION",
  name: "",
  qty: "1",
  unitPrice: "0",
  discount: "0",
  tax: "0",
});

export const InvoicesPage = () => {
  const [searchParams] = useSearchParams();
  const presetVisitId = searchParams.get("visitId") || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [visits, setVisits] = useState<VisitOption[]>([]);
  const [form, setForm] = useState({
    visitId: presetVisitId,
    paymentMode: "CASH",
    paidAmount: "0",
    discount: "0",
    tax: "0",
    notes: "",
  });
  const [items, setItems] = useState<ItemForm[]>([blankItem()]);
  const [lastCreated, setLastCreated] = useState<{ invoiceId: number; visitId: number; dueAmount: number } | null>(null);

  const load = async (q = query) => {
    setLoading(true);
    try {
      const [invoiceRes, visitRes] = await Promise.all([
        invoiceApi.list({ page: 1, pageSize: 30, q }),
        visitApi.list({ page: 1, pageSize: 100 }),
      ]);
      setInvoices(invoiceRes.data.data);
      setVisits((visitRes.data.data as unknown as VisitOption[]).filter((visit) => !visit.invoice));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (presetVisitId) {
      setForm((prev) => ({ ...prev, visitId: presetVisitId }));
    }
  }, [presetVisitId]);

  useEffect(() => {
    const selected = visits.find((visit) => String(visit.id) === form.visitId);
    if (!selected) return;

    if (items.length === 1 && !items[0].name) {
      setItems([
        {
          category: "CONSULTATION",
          name: "Consultation Fee",
          qty: "1",
          unitPrice: String(selected.consultationFee || 0),
          discount: "0",
          tax: "0",
        },
      ]);
    }
  }, [form.visitId, visits]);

  const totals = useMemo(() => {
    const computed = items.map((item) => {
      const qty = Number(item.qty || 0);
      const unitPrice = Number(item.unitPrice || 0);
      const discount = Number(item.discount || 0);
      const tax = Number(item.tax || 0);
      const base = qty * unitPrice;
      const amount = base - discount + tax;
      return { base, amount, discount, tax };
    });

    const subtotal = computed.reduce((sum, row) => sum + row.base, 0);
    const itemDiscount = computed.reduce((sum, row) => sum + row.discount, 0);
    const itemTax = computed.reduce((sum, row) => sum + row.tax, 0);
    const invoiceDiscount = Number(form.discount || 0);
    const invoiceTax = Number(form.tax || 0);
    const totalDiscount = itemDiscount + invoiceDiscount;
    const totalTax = itemTax + invoiceTax;
    const total = subtotal - totalDiscount + totalTax;
    const paidAmount = Number(form.paidAmount || 0);
    const dueAmount = total - paidAmount;

    return {
      subtotal,
      totalDiscount,
      totalTax,
      total,
      dueAmount,
    };
  }, [items, form.discount, form.paidAmount, form.tax]);

  const createInvoice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.visitId) {
      toast.error("Select a visit");
      return;
    }

    const preparedItems = items
      .filter((item) => item.name && Number(item.qty) > 0)
      .map((item) => ({
        category: item.category,
        name: item.name,
        qty: Number(item.qty),
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        tax: Number(item.tax),
      }));

    if (preparedItems.length === 0) {
      toast.error("Add at least one line item");
      return;
    }

    setSaving(true);
    try {
      const created = await invoiceApi.create({
        visitId: Number(form.visitId),
        items: preparedItems,
        discount: Number(form.discount || 0),
        tax: Number(form.tax || 0),
        paymentMode: form.paymentMode,
        paidAmount: Number(form.paidAmount || 0),
        notes: form.notes || undefined,
      });

      toast.success("Invoice created");
      setLastCreated({
        invoiceId: created.data.data.id,
        visitId: created.data.data.visitId,
        dueAmount: Number(created.data.data.dueAmount || 0),
      });
      setForm({
        visitId: "",
        paymentMode: "CASH",
        paidAmount: "0",
        discount: "0",
        tax: "0",
        notes: "",
      });
      setItems([blankItem()]);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Billing & Invoices</h1>
        <p className="text-sm text-slate-500">Generate professional invoices with print-ready templates.</p>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Create Invoice</h2>
        <form onSubmit={createInvoice} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Select
              label="Visit"
              value={form.visitId}
              onChange={(e) => setForm((prev) => ({ ...prev, visitId: e.target.value }))}
              required
            >
              <option value="">Select visit</option>
              {visits.map((visit) => (
                <option key={visit.id} value={visit.id}>
                  #{visit.id} - {visit.patient.name} - Dr. {visit.doctor.name}
                </option>
              ))}
            </Select>
            <Select
              label="Payment Mode"
              value={form.paymentMode}
              onChange={(e) => setForm((prev) => ({ ...prev, paymentMode: e.target.value }))}
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
            </Select>
            <Input
              label="Paid Amount"
              type="number"
              min={0}
              step="0.01"
              value={form.paidAmount}
              onChange={(e) => setForm((prev) => ({ ...prev, paidAmount: e.target.value }))}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Line Items</h3>
              <Button type="button" variant="secondary" onClick={() => setItems((prev) => [...prev, blankItem()])}>
                + Add Item
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-7">
                <Select
                  value={item.category}
                  onChange={(e) =>
                    setItems((prev) => prev.map((row, idx) => (idx === index ? { ...row, category: e.target.value as ItemForm["category"] } : row)))
                  }
                >
                  <option value="CONSULTATION">Consultation</option>
                  <option value="LAB">Lab</option>
                  <option value="PROCEDURE">Procedure</option>
                  <option value="MEDICINE">Medicine</option>
                  <option value="MISC">Misc</option>
                </Select>
                <Input
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) =>
                    setItems((prev) => prev.map((row, idx) => (idx === index ? { ...row, name: e.target.value } : row)))
                  }
                />
                <Input
                  placeholder="Qty"
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.qty}
                  onChange={(e) =>
                    setItems((prev) => prev.map((row, idx) => (idx === index ? { ...row, qty: e.target.value } : row)))
                  }
                />
                <Input
                  placeholder="Unit Price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) =>
                    setItems((prev) => prev.map((row, idx) => (idx === index ? { ...row, unitPrice: e.target.value } : row)))
                  }
                />
                <Input
                  placeholder="Discount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.discount}
                  onChange={(e) =>
                    setItems((prev) => prev.map((row, idx) => (idx === index ? { ...row, discount: e.target.value } : row)))
                  }
                />
                <Input
                  placeholder="Tax"
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.tax}
                  onChange={(e) =>
                    setItems((prev) => prev.map((row, idx) => (idx === index ? { ...row, tax: e.target.value } : row)))
                  }
                />
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)))}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Input
              label="Invoice Discount"
              type="number"
              min={0}
              step="0.01"
              value={form.discount}
              onChange={(e) => setForm((prev) => ({ ...prev, discount: e.target.value }))}
            />
            <Input
              label="Invoice Tax"
              type="number"
              min={0}
              step="0.01"
              value={form.tax}
              onChange={(e) => setForm((prev) => ({ ...prev, tax: e.target.value }))}
            />
            <Input
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div className="rounded-lg border border-brand-100 bg-brand-50 p-4 text-sm">
            <p>Subtotal: <strong>{formatCurrency(totals.subtotal)}</strong></p>
            <p>Total Discount: <strong>{formatCurrency(totals.totalDiscount)}</strong></p>
            <p>Total Tax: <strong>{formatCurrency(totals.totalTax)}</strong></p>
            <p className="text-base">Grand Total: <strong>{formatCurrency(totals.total)}</strong></p>
            <p>Due Amount: <strong>{formatCurrency(totals.dueAmount)}</strong></p>
          </div>

          <Button type="submit" disabled={saving}>{saving ? "Generating..." : "Generate Invoice"}</Button>
        </form>
      </Card>

      {lastCreated ? (
        <Card className="border border-emerald-200 bg-emerald-50/60">
          <h3 className="text-lg font-semibold text-emerald-800">Billing Completed Successfully</h3>
          <p className="mt-1 text-sm text-emerald-700">Invoice generated for Visit #{lastCreated.visitId}. Use quick actions below.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to={`/invoices/${lastCreated.invoiceId}/print`}>
              <Button>Print Bill</Button>
            </Link>
            {lastCreated.dueAmount <= 0 ? (
              <Link to={`/prescriptions/${lastCreated.visitId}/print`}>
                <Button variant="secondary">Print Prescription</Button>
              </Link>
            ) : (
              <Badge tone="warning">Prescription enabled after full payment</Badge>
            )}
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          <Input
            className="max-w-sm"
            placeholder="Search invoice / patient / phone"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button onClick={() => load(query)}>Search</Button>
          <Button variant="secondary" onClick={() => {
            setQuery("");
            load("");
          }}>Reset</Button>
        </div>

        {loading ? (
          <Loader />
        ) : invoices.length === 0 ? (
          <EmptyState text="No invoices found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2">Invoice No</th>
                  <th className="py-2">Patient</th>
                  <th className="py-2">Total</th>
                  <th className="py-2">Paid</th>
                  <th className="py-2">Due</th>
                  <th className="py-2">Payment</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-slate-100">
                    <td className="py-3 font-medium">{invoice.invoiceNo}</td>
                    <td className="py-3">{invoice.visit?.patient?.name ?? "-"}</td>
                    <td className="py-3">{formatCurrency(invoice.total)}</td>
                    <td className="py-3">{formatCurrency(invoice.paidAmount)}</td>
                    <td className="py-3">
                      <Badge tone={invoice.dueAmount > 0 ? "warning" : "success"}>{formatCurrency(invoice.dueAmount)}</Badge>
                    </td>
                    <td className="py-3">{invoice.paymentMode}</td>
                    <td className="py-3">{formatDateTime(invoice.createdAt)}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Link to={`/invoices/${invoice.id}/print`}>
                          <Button variant="secondary" className="h-8 px-3 py-1 text-xs">A4 Print</Button>
                        </Link>
                        <Link to={`/invoices/${invoice.id}/print?format=thermal`}>
                          <Button variant="ghost" className="h-8 px-3 py-1 text-xs">80mm</Button>
                        </Link>
                        {Number(invoice.dueAmount || 0) <= 0 ? (
                          <Link to={`/prescriptions/${invoice.visit?.id}/print`}>
                            <Button variant="ghost" className="h-8 px-3 py-1 text-xs">Print Prescription</Button>
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
