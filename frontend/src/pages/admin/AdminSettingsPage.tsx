import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../api/client";
import { settingsApi } from "../../api/services";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Loader } from "../../components/ui/Loader";
import { Textarea } from "../../components/ui/Textarea";

export const AdminSettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingKansalt, setUploadingKansalt] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [kansaltPreview, setKansaltPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    hospitalName: "",
    address: "",
    phone: "",
    gstin: "",
    defaultConsultationFee: "500",
    invoicePrefix: "SIMS",
    invoiceSequence: "1",
    footerNote: "",
    kansaltLogoPath: "",
  });

  const uploadBaseUrl = import.meta.env.VITE_UPLOAD_BASE_URL || window.location.origin;

  const load = async () => {
    setLoading(true);
    try {
      const res = await settingsApi.get();
      const data = res.data.data;
      setForm({
        hospitalName: data.hospitalName,
        address: data.address,
        phone: data.phone,
        gstin: data.gstin || "",
        defaultConsultationFee: String(data.defaultConsultationFee),
        invoicePrefix: data.invoicePrefix,
        invoiceSequence: String(data.invoiceSequence || 1),
        footerNote: data.footerNote || "",
        kansaltLogoPath: data.kansaltLogoPath || "",
      });
      setLogoPreview(data.logoPath ? `${uploadBaseUrl}${data.logoPath}` : null);
      setKansaltPreview(data.kansaltLogoPath ? `${uploadBaseUrl}${data.kansaltLogoPath}` : null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await settingsApi.update({
        hospitalName: form.hospitalName,
        address: form.address,
        phone: form.phone,
        gstin: form.gstin || null,
        defaultConsultationFee: Number(form.defaultConsultationFee),
        invoicePrefix: form.invoicePrefix,
        invoiceSequence: Number(form.invoiceSequence || 1),
        footerNote: form.footerNote || null,
        kansaltLogoPath: form.kansaltLogoPath || null,
      });
      toast.success("Settings updated");
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const uploadKansaltLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingKansalt(true);
    try {
      const res = await settingsApi.uploadKansaltLogo(file);
      const path = res.data.data.kansaltLogoPath;
      setKansaltPreview(path ? `${uploadBaseUrl}${path}` : null);
      setForm((prev) => ({ ...prev, kansaltLogoPath: path || "" }));
      toast.success("Kansalt logo uploaded");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUploadingKansalt(false);
    }
  };

  const uploadLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await settingsApi.uploadLogo(file);
      const path = res.data.data.logoPath;
      setLogoPreview(path ? `${uploadBaseUrl}${path}` : null);
      toast.success("Logo uploaded");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">SIMS Hospital Settings</h1>
        <p className="text-sm text-slate-500">Configure profile, fees, invoice numbering and branding.</p>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Hospital Profile</h2>
        <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
          <Input
            label="Hospital Name"
            value={form.hospitalName}
            onChange={(e) => setForm((prev) => ({ ...prev, hospitalName: e.target.value }))}
            required
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            required
          />
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            required
          />
          <Input
            label="GSTIN (optional)"
            value={form.gstin}
            onChange={(e) => setForm((prev) => ({ ...prev, gstin: e.target.value }))}
          />

          <Input
            label="Default Consultation Fee"
            type="number"
            min={0}
            value={form.defaultConsultationFee}
            onChange={(e) => setForm((prev) => ({ ...prev, defaultConsultationFee: e.target.value }))}
          />
          <Input
            label="Invoice Prefix"
            value={form.invoicePrefix}
            onChange={(e) => setForm((prev) => ({ ...prev, invoicePrefix: e.target.value.toUpperCase() }))}
            required
          />
          <Input
            label="Invoice Next Sequence"
            type="number"
            min={1}
            value={form.invoiceSequence}
            onChange={(e) => setForm((prev) => ({ ...prev, invoiceSequence: e.target.value }))}
          />

          <div className="md:col-span-2">
            <Textarea
              label="Footer Note"
              value={form.footerNote}
              onChange={(e) => setForm((prev) => ({ ...prev, footerNote: e.target.value }))}
            />
          </div>

          <div className="md:col-span-2">
            <Input
              label="Kansalt Logo Path (optional)"
              value={form.kansaltLogoPath}
              onChange={(e) => setForm((prev) => ({ ...prev, kansaltLogoPath: e.target.value }))}
            />
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Settings"}</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Brand Logos</h2>
        <div className="flex flex-wrap items-center gap-4">
          {logoPreview ? <img src={logoPreview} alt="SIMS Hospital Logo" className="h-16 w-16 rounded-lg object-cover" /> : <div className="h-16 w-16 rounded-lg border border-dashed border-slate-300" />}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
            <input type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
            {uploading ? "Uploading..." : "Upload SIMS Logo"}
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {kansaltPreview ? <img src={kansaltPreview} alt="Kansalt Logo" className="h-10 w-auto rounded object-contain" /> : <div className="h-10 w-32 rounded-lg border border-dashed border-slate-300" />}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
            <input type="file" accept="image/*,.svg" className="hidden" onChange={uploadKansaltLogo} />
            {uploadingKansalt ? "Uploading..." : "Upload Kansalt Logo"}
          </label>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Local Backup Reminder</h2>
        <p className="text-sm text-slate-600">Backup `%APPDATA%\\SIMS Hospital\\data\\sims.db` and `%APPDATA%\\SIMS Hospital\\uploads\\` daily.</p>
      </Card>
    </div>
  );
};
