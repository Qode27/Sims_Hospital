import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../api/client";
import { doctorApi, ipdApi, patientApi } from "../../api/services";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Loader } from "../../components/ui/Loader";
import { Select } from "../../components/ui/Select";
import { formatDateTime } from "../../utils/format";

export const IpdPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState({
    patientId: "",
    attendingDoctorId: "",
    ward: "General",
    room: "101",
    bed: "A",
    diagnosis: "",
    reason: "",
    admittedAt: "",
  });

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const load = async () => {
    setLoading(true);
    try {
      const [ipdRes, patientRes, doctorRes] = await Promise.all([
        ipdApi.list({ q: query, status: statusFilter || undefined, date: today, page: 1, pageSize: 40 }),
        patientApi.list({ page: 1, pageSize: 200, q: "" }),
        doctorApi.list({ active: true }),
      ]);
      setRows(ipdRes.data.data);
      setPatients(patientRes.data.data);
      setDoctors(doctorRes.data.data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createAdmission = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await ipdApi.create({
        patientId: Number(form.patientId),
        attendingDoctorId: Number(form.attendingDoctorId),
        ward: form.ward,
        room: form.room,
        bed: form.bed,
        diagnosis: form.diagnosis || undefined,
        reason: form.reason || undefined,
        admittedAt: form.admittedAt ? new Date(form.admittedAt).toISOString() : undefined,
      });
      toast.success("IPD admission created");
      setForm((prev) => ({ ...prev, diagnosis: "", reason: "", admittedAt: "" }));
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const discharge = async (row: any) => {
    const note = prompt("Discharge note (optional)") || undefined;
    try {
      await ipdApi.discharge(row.id, { dischargeNote: note });
      toast.success("Patient discharged");
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">IPD Admissions</h1>
        <p className="text-sm text-slate-500">Manage inpatient admissions, bed allocation, and discharge workflow.</p>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">New IPD Admission</h2>
        <form onSubmit={createAdmission} className="grid gap-3 md:grid-cols-3">
          <Select label="Patient" value={form.patientId} onChange={(e) => setForm((p) => ({ ...p, patientId: e.target.value }))} required>
            <option value="">Select patient</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.mrn})</option>)}
          </Select>
          <Select label="Attending Doctor" value={form.attendingDoctorId} onChange={(e) => setForm((p) => ({ ...p, attendingDoctorId: e.target.value }))} required>
            <option value="">Select doctor</option>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Input label="Admitted At" type="datetime-local" value={form.admittedAt} onChange={(e) => setForm((p) => ({ ...p, admittedAt: e.target.value }))} />
          <Input label="Ward" value={form.ward} onChange={(e) => setForm((p) => ({ ...p, ward: e.target.value }))} required />
          <Input label="Room" value={form.room} onChange={(e) => setForm((p) => ({ ...p, room: e.target.value }))} required />
          <Input label="Bed" value={form.bed} onChange={(e) => setForm((p) => ({ ...p, bed: e.target.value }))} required />
          <Input label="Diagnosis" value={form.diagnosis} onChange={(e) => setForm((p) => ({ ...p, diagnosis: e.target.value }))} />
          <Input label="Reason for Admission" value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} />
          <div className="md:col-span-3">
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Admit Patient"}</Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          <Input className="max-w-sm" placeholder="Search patient/MRN/ward/room/bed" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All status</option>
            <option value="ADMITTED">Admitted</option>
            <option value="DISCHARGED">Discharged</option>
          </Select>
          <Button onClick={load}>Apply</Button>
        </div>

        {loading ? <Loader /> : rows.length === 0 ? <EmptyState text="No IPD records found." /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2">Patient</th>
                  <th className="py-2">Doctor</th>
                  <th className="py-2">Ward/Room/Bed</th>
                  <th className="py-2">Admitted</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="py-3">
                      <p className="font-medium">{row.patient.name}</p>
                      <p className="text-xs text-slate-500">{row.patient.mrn}</p>
                    </td>
                    <td className="py-3">Dr. {row.attendingDoctor.name}</td>
                    <td className="py-3">{row.ward} / {row.room} / {row.bed}</td>
                    <td className="py-3">{formatDateTime(row.admittedAt)}</td>
                    <td className="py-3">
                      <Badge tone={row.status === "DISCHARGED" ? "success" : "warning"}>{row.status}</Badge>
                    </td>
                    <td className="py-3">
                      {row.status === "ADMITTED" ? (
                        <Button className="h-8 px-3 py-1 text-xs" variant="secondary" onClick={() => discharge(row)}>Discharge</Button>
                      ) : (
                        <span className="text-xs text-slate-500">Discharged {row.dischargedAt ? formatDateTime(row.dischargedAt) : ""}</span>
                      )}
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
