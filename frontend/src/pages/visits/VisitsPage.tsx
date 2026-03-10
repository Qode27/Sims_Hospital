import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { getErrorMessage } from "../../api/client";
import { doctorApi, patientApi, visitApi } from "../../api/services";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Loader } from "../../components/ui/Loader";
import { Select } from "../../components/ui/Select";
import { formatCurrency, formatDateTime } from "../../utils/format";

export const VisitsPage = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [patientMode, setPatientMode] = useState<"existing" | "new">("existing");
  const [transferVisitId, setTransferVisitId] = useState<number | null>(null);
  const [transferForm, setTransferForm] = useState({
    attendingDoctorId: "",
    ward: "General",
    room: "101",
    bed: "A",
    diagnosis: "",
    reason: "",
    notes: "",
  });
  const [form, setForm] = useState({
    patientId: "",
    doctorId: "",
    consultationFee: "500",
    reason: "",
    scheduledAt: "",
    newName: "",
    newAge: "",
    newGender: "MALE",
    newPhone: "",
    newAddress: "",
    newIdProof: "",
  });

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const load = async (search = query) => {
    setLoading(true);
    try {
      const [visitsRes, doctorsRes, patientsRes] = await Promise.all([
        visitApi.list({ date: today, q: search, type: "OPD", page: 1, pageSize: 50 }),
        doctorApi.list({ active: true }),
        patientApi.list({ page: 1, pageSize: 200, q: "" }),
      ]);

      setRows(visitsRes.data.data);
      setDoctors(doctorsRes.data.data);
      setPatients(patientsRes.data.data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createVisit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        doctorId: Number(form.doctorId),
        consultationFee: Number(form.consultationFee || 0),
        reason: form.reason,
        type: "OPD",
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
      };

      if (patientMode === "existing") {
        payload.patientId = Number(form.patientId);
      } else {
        payload.patient = {
          name: form.newName,
          age: form.newAge ? Number(form.newAge) : undefined,
          gender: form.newGender,
          phone: form.newPhone,
          address: form.newAddress,
          idProof: form.newIdProof || undefined,
        };
      }

      await visitApi.create(payload);
      toast.success("OPD visit created");
      setForm((prev) => ({
        ...prev,
        reason: "",
        scheduledAt: "",
        patientId: "",
        newName: "",
        newAge: "",
        newPhone: "",
        newAddress: "",
        newIdProof: "",
      }));
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (visitId: number, status: string) => {
    try {
      await visitApi.updateStatus(visitId, status);
      toast.success("Status updated");
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const transferToIpd = async () => {
    if (!transferVisitId) return;
    try {
      await visitApi.transferToIpd(transferVisitId, {
        attendingDoctorId: transferForm.attendingDoctorId ? Number(transferForm.attendingDoctorId) : undefined,
        ward: transferForm.ward,
        room: transferForm.room,
        bed: transferForm.bed,
        diagnosis: transferForm.diagnosis || undefined,
        reason: transferForm.reason || undefined,
        notes: transferForm.notes || undefined,
      });
      toast.success("Patient transferred to IPD");
      setTransferVisitId(null);
      setTransferForm({
        attendingDoctorId: "",
        ward: "General",
        room: "101",
        bed: "A",
        diagnosis: "",
        reason: "",
        notes: "",
      });
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">OPD</h1>
        <p className="text-sm text-slate-500">Create OPD visits, complete billing, and transfer to IPD when required.</p>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Create OPD Visit</h2>
        <form onSubmit={createVisit} className="grid gap-3 md:grid-cols-3">
          <Select label="Patient Mode" value={patientMode} onChange={(e) => setPatientMode(e.target.value as "existing" | "new") }>
            <option value="existing">Existing Patient</option>
            <option value="new">New Patient</option>
          </Select>

          {patientMode === "existing" ? (
            <Select label="Select Patient" value={form.patientId} onChange={(e) => setForm((prev) => ({ ...prev, patientId: e.target.value }))} required>
              <option value="">Choose patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>{patient.name} ({patient.phone})</option>
              ))}
            </Select>
          ) : (
            <Input label="New Patient Name" value={form.newName} onChange={(e) => setForm((prev) => ({ ...prev, newName: e.target.value }))} required />
          )}

          <Select label="Doctor" value={form.doctorId} onChange={(e) => setForm((prev) => ({ ...prev, doctorId: e.target.value }))} required>
            <option value="">Assign doctor</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
            ))}
          </Select>

          <Input label="Consultation Fee" type="number" min={0} value={form.consultationFee} onChange={(e) => setForm((prev) => ({ ...prev, consultationFee: e.target.value }))} required />
          <Input label="Scheduled Date & Time" type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((prev) => ({ ...prev, scheduledAt: e.target.value }))} />
          <Input label="Reason" value={form.reason} onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))} />

          {patientMode === "new" ? (
            <>
              <Input label="Age" type="number" min={0} value={form.newAge} onChange={(e) => setForm((prev) => ({ ...prev, newAge: e.target.value }))} />
              <Select label="Gender" value={form.newGender} onChange={(e) => setForm((prev) => ({ ...prev, newGender: e.target.value }))}>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </Select>
              <Input label="Phone" value={form.newPhone} onChange={(e) => setForm((prev) => ({ ...prev, newPhone: e.target.value }))} required />
              <Input label="Address" value={form.newAddress} onChange={(e) => setForm((prev) => ({ ...prev, newAddress: e.target.value }))} required />
              <Input label="ID Proof" value={form.newIdProof} onChange={(e) => setForm((prev) => ({ ...prev, newIdProof: e.target.value }))} />
            </>
          ) : null}

          <div className="md:col-span-3">
            <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Visit"}</Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          <Input className="max-w-sm" placeholder="Search patient / phone / MRN" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Button onClick={() => load(query)}>Search</Button>
          <Button variant="secondary" onClick={() => { setQuery(""); load(""); }}>Reset</Button>
        </div>

        {loading ? <Loader /> : rows.length === 0 ? <EmptyState text="No OPD visits found." /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2">Visit</th>
                  <th className="py-2">Patient</th>
                  <th className="py-2">Doctor</th>
                  <th className="py-2">Fee</th>
                  <th className="py-2">Time</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="py-3">#{row.id}</td>
                    <td className="py-3">
                      <p className="font-medium">{row.patient.name}</p>
                      <p className="text-xs text-slate-500">{row.patient.phone}</p>
                    </td>
                    <td className="py-3">Dr. {row.doctor.name}</td>
                    <td className="py-3">{formatCurrency(row.consultationFee)}</td>
                    <td className="py-3">{formatDateTime(row.scheduledAt)}</td>
                    <td className="py-3">
                      <Badge tone={row.status === "COMPLETED" ? "success" : row.status === "IN_PROGRESS" ? "warning" : "default"}>{row.status}</Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        {row.status !== "IN_PROGRESS" ? <Button className="h-8 px-3 py-1 text-xs" variant="ghost" onClick={() => changeStatus(row.id, "IN_PROGRESS")}>Start</Button> : null}
                        {row.status !== "COMPLETED" ? <Button className="h-8 px-3 py-1 text-xs" variant="ghost" onClick={() => changeStatus(row.id, "COMPLETED")}>Complete</Button> : null}
                        {row.invoice ? (
                          <Button className="h-8 px-3 py-1 text-xs" variant="secondary" onClick={() => navigate(`/invoices/${row.invoice.id}/print`)}>Print Bill</Button>
                        ) : (
                          <Button className="h-8 px-3 py-1 text-xs" variant="secondary" onClick={() => navigate(`/invoices?visitId=${row.id}`)}>Create Bill</Button>
                        )}
                        {!row.opdToIpdTransfer ? (
                          <Button className="h-8 px-3 py-1 text-xs" variant="secondary" onClick={() => {
                            setTransferVisitId(row.id);
                            setTransferForm((prev) => ({ ...prev, attendingDoctorId: String(row.doctorId), diagnosis: row.reason || "", reason: row.reason || "" }));
                          }}>
                            Transfer to IPD
                          </Button>
                        ) : (
                          <Badge tone="success">Transferred</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {transferVisitId ? (
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Transfer OPD #{transferVisitId} to IPD</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <Select label="Attending Doctor" value={transferForm.attendingDoctorId} onChange={(e) => setTransferForm((p) => ({ ...p, attendingDoctorId: e.target.value }))}>
              <option value="">Select doctor</option>
              {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
            </Select>
            <Input label="Ward" value={transferForm.ward} onChange={(e) => setTransferForm((p) => ({ ...p, ward: e.target.value }))} />
            <Input label="Room" value={transferForm.room} onChange={(e) => setTransferForm((p) => ({ ...p, room: e.target.value }))} />
            <Input label="Bed" value={transferForm.bed} onChange={(e) => setTransferForm((p) => ({ ...p, bed: e.target.value }))} />
            <Input label="Diagnosis" value={transferForm.diagnosis} onChange={(e) => setTransferForm((p) => ({ ...p, diagnosis: e.target.value }))} />
            <Input label="Reason" value={transferForm.reason} onChange={(e) => setTransferForm((p) => ({ ...p, reason: e.target.value }))} />
            <Input className="md:col-span-3" label="Transfer Notes" value={transferForm.notes} onChange={(e) => setTransferForm((p) => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={transferToIpd}>Confirm Transfer</Button>
            <Button variant="secondary" onClick={() => setTransferVisitId(null)}>Cancel</Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
};
