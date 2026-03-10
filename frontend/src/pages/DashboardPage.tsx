import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { invoiceApi, patientApi, visitApi } from "../api/services";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Loader } from "../components/ui/Loader";
import { useAuth } from "../context/AuthContext";
import type { Invoice, Visit } from "../types";
import { formatCurrency, formatDateTime } from "../utils/format";

export const DashboardPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [visitRows, setVisitRows] = useState<Visit[]>([]);
  const [invoiceRows, setInvoiceRows] = useState<Invoice[]>([]);
  const [patientCount, setPatientCount] = useState(0);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [visitsRes, invoicesRes, patientsRes] = await Promise.all([
          visitApi.list({ page: 1, pageSize: 5, date: today }),
          invoiceApi.list({ page: 1, pageSize: 5 }),
          patientApi.list({ page: 1, pageSize: 1 }),
        ]);

        setVisitRows(visitsRes.data.data);
        setInvoiceRows(invoicesRes.data.data);
        setPatientCount(patientsRes.data.pagination.total);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const totalCollection = useMemo(
    () => invoiceRows.reduce((sum, row) => sum + row.paidAmount, 0),
    [invoiceRows],
  );

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Welcome, {user?.name}</h1>
        <p className="text-sm text-slate-500">Quick overview of today’s hospital operations.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Total Patients</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{patientCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Today Visits</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{visitRows.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Recent Collections</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{formatCurrency(totalCollection)}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Visit Queue</h2>
            {user?.role !== "DOCTOR" ? <Link className="text-sm text-brand-600" to="/visits">Open</Link> : <Link className="text-sm text-brand-600" to="/doctor">Open</Link>}
          </div>
          {visitRows.length === 0 ? (
            <EmptyState text="No visits found for today." />
          ) : (
            <div className="space-y-3">
              {visitRows.map((visit) => (
                <div key={visit.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{visit.patient.name}</p>
                    <span className="text-xs text-slate-500">{visit.status}</span>
                  </div>
                  <p className="text-sm text-slate-600">Dr. {visit.doctor.name}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(visit.scheduledAt)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Latest Invoices</h2>
            <Link className="text-sm text-brand-600" to="/invoices">Open</Link>
          </div>
          {invoiceRows.length === 0 ? (
            <EmptyState text="No invoices available." />
          ) : (
            <div className="space-y-3">
              {invoiceRows.map((invoice) => (
                <div key={invoice.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{invoice.invoiceNo}</p>
                    <p className="font-semibold text-brand-700">{formatCurrency(invoice.total)}</p>
                  </div>
                  <p className="text-sm text-slate-600">{invoice.visit?.patient?.name ?? "Patient"}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(invoice.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
