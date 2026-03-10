import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getErrorMessage } from "../../api/client";
import { invoiceApi } from "../../api/services";
import { Button } from "../../components/ui/Button";
import { Loader } from "../../components/ui/Loader";
import { formatCurrency, formatDateTime } from "../../utils/format";
import "../../styles/print.css";

export const InvoicePrintPage = () => {
  const params = useParams();
  const invoiceId = Number(params.id);
  const [searchParams] = useSearchParams();
  const format = searchParams.get("format") === "thermal" ? "thermal" : "a4";

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any | null>(null);
  const [settings, setSettings] = useState<any | null>(null);

  const uploadBaseUrl = import.meta.env.VITE_UPLOAD_BASE_URL || window.location.origin;
  const logoSrc = useMemo(() => {
    if (!settings?.logoPath) return null;
    return `${uploadBaseUrl}${settings.logoPath}`;
  }, [settings?.logoPath, uploadBaseUrl]);

  useEffect(() => {
    document.body.setAttribute("data-print-format", format);
    return () => {
      document.body.removeAttribute("data-print-format");
    };
  }, [format]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await invoiceApi.get(invoiceId);
        setInvoice(res.data.data);
        setSettings(res.data.settings);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    if (invoiceId) {
      load();
    }
  }, [invoiceId]);

  if (loading) {
    return <Loader text="Loading invoice..." />;
  }

  if (!invoice || !settings) {
    return <div className="p-6">Invoice not found.</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="print-controls no-print flex flex-wrap items-center justify-between rounded-xl border bg-white p-4 shadow-panel">
        <div>
          <h1 className="text-lg font-semibold">Invoice Print View</h1>
          <p className="text-sm text-slate-500">Format: {format === "a4" ? "A4" : "Thermal 80mm"}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/invoices/${invoice.id}/print`}>
            <Button variant={format === "a4" ? "primary" : "secondary"}>A4</Button>
          </Link>
          <Link to={`/invoices/${invoice.id}/print?format=thermal`}>
            <Button variant={format === "thermal" ? "primary" : "secondary"}>80mm</Button>
          </Link>
          <Button onClick={() => window.print()}>Print Bill</Button>
          <Link to="/invoices">
            <Button variant="ghost">Back</Button>
          </Link>
        </div>
      </div>

      <article
        className={`print-sheet-a4 rounded-xl border border-slate-200 bg-white p-8 shadow-panel ${
          format === "a4" ? "" : "hidden"
        }`}
      >
        <header className="mb-6 flex items-start justify-between border-b border-slate-200 pb-5">
          <div className="flex gap-3">
            {logoSrc ? <img src={logoSrc} alt="SIMS Hospital Logo" className="h-14 w-14 rounded object-cover" /> : null}
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{settings.hospitalName}</h2>
              <p className="text-sm text-slate-600">{settings.address}</p>
              <p className="text-sm text-slate-600">Phone: {settings.phone}</p>
              {settings.gstin ? <p className="text-sm text-slate-600">GSTIN: {settings.gstin}</p> : null}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-slate-500">Invoice</p>
            <p className="text-lg font-semibold">{invoice.invoiceNo}</p>
            <p className="text-sm text-slate-600">{formatDateTime(invoice.createdAt)}</p>
          </div>
        </header>

        <section className="grid gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-slate-500">Patient</p>
            <p className="font-medium">{invoice.visit.patient.name}</p>
            <p className="text-sm text-slate-600">MRN: {invoice.visit.patient.mrn}</p>
            <p className="text-sm text-slate-600">Phone: {invoice.visit.patient.phone}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Consulting Doctor</p>
            <p className="font-medium">Dr. {invoice.visit.doctor.name}</p>
            {invoice.visit.doctor?.doctorProfile?.qualification ? (
              <p className="text-sm text-slate-600">{invoice.visit.doctor.doctorProfile.qualification}</p>
            ) : null}
            <p className="text-sm text-slate-600">Visit ID: #{invoice.visit.id}</p>
            <p className="text-sm text-slate-600">Payment: {invoice.paymentMode}</p>
          </div>
        </section>

        <table className="mt-5 min-w-full border border-slate-200 text-sm">
          <thead className="bg-slate-100 text-left text-slate-600">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-right">Rate</th>
              <th className="px-3 py-2 text-right">Disc</th>
              <th className="px-3 py-2 text-right">Tax</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item: any, index: number) => (
              <tr key={item.id} className="border-t border-slate-200">
                <td className="px-3 py-2">{index + 1}</td>
                <td className="px-3 py-2">{item.name}</td>
                <td className="px-3 py-2">{item.category}</td>
                <td className="px-3 py-2 text-right">{item.qty}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(item.discount)}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(item.tax)}</td>
                <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="mt-4 ml-auto w-full max-w-sm rounded-lg border border-slate-200 p-3 text-sm">
          <div className="flex justify-between py-1"><span>Subtotal</span><strong>{formatCurrency(invoice.subtotal)}</strong></div>
          <div className="flex justify-between py-1"><span>Discount</span><strong>{formatCurrency(invoice.discount)}</strong></div>
          <div className="flex justify-between py-1"><span>Tax</span><strong>{formatCurrency(invoice.tax)}</strong></div>
          <div className="flex justify-between border-t border-slate-200 py-2 text-base"><span>Total</span><strong>{formatCurrency(invoice.total)}</strong></div>
          <div className="flex justify-between py-1"><span>Paid</span><strong>{formatCurrency(invoice.paidAmount)}</strong></div>
          <div className="flex justify-between py-1"><span>Due</span><strong>{formatCurrency(invoice.dueAmount)}</strong></div>
        </section>

        <footer className="mt-8 flex items-end justify-between text-sm text-slate-600">
          <p>{settings.footerNote || "Get well soon. Thank you for visiting."}</p>
          <div className="text-right">
            <p className="mb-8">Authorized Signature</p>
            <div className="w-40 border-b border-slate-400" />
          </div>
        </footer>
      </article>

      <article
        className={`print-sheet-thermal rounded-xl border border-slate-200 bg-white p-4 shadow-panel ${
          format === "thermal" ? "" : "hidden"
        }`}
      >
        <div className="text-center">
          {logoSrc ? <img src={logoSrc} alt="SIMS Hospital Logo" className="mx-auto h-10 w-10 rounded object-cover" /> : null}
          <p className="font-bold">{settings.hospitalName}</p>
          <p className="text-xs">{settings.address}</p>
          <p className="text-xs">{settings.phone}</p>
          <p className="mt-2 text-xs">Invoice: {invoice.invoiceNo}</p>
          <p className="text-xs">{formatDateTime(invoice.createdAt)}</p>
        </div>

        <div className="mt-3 border-y border-dashed border-slate-300 py-2 text-xs">
          <p>Patient: {invoice.visit.patient.name}</p>
          <p>Doctor: Dr. {invoice.visit.doctor.name}</p>
        </div>

        <table className="mt-2 w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-1 text-left">Item</th>
              <th className="py-1 text-right">Amt</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item: any) => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="py-1">{item.name}</td>
                <td className="py-1 text-right">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-2 space-y-1 text-xs">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span></div>
          <div className="flex justify-between"><span>Discount</span><span>{formatCurrency(invoice.discount)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(invoice.tax)}</span></div>
          <div className="flex justify-between border-t border-dashed border-slate-300 pt-1 font-semibold"><span>Total</span><span>{formatCurrency(invoice.total)}</span></div>
          <div className="flex justify-between"><span>Paid</span><span>{formatCurrency(invoice.paidAmount)}</span></div>
          <div className="flex justify-between"><span>Due</span><span>{formatCurrency(invoice.dueAmount)}</span></div>
        </div>

        <p className="mt-3 text-center text-[10px]">{settings.footerNote || "Thank you"}</p>
      </article>
    </div>
  );
};
