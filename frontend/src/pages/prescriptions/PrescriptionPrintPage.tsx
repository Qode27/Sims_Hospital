import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../api/client";
import { prescriptionApi, settingsApi, visitApi } from "../../api/services";
import { Button } from "../../components/ui/Button";
import { Loader } from "../../components/ui/Loader";
import { formatDateTime } from "../../utils/format";
import "../../styles/print.css";

const fieldOrBlank = (value: unknown) => {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return text;
};

export const PrescriptionPrintPage = () => {
  const params = useParams();
  const visitId = Number(params.visitId);
  const [loading, setLoading] = useState(true);
  const [visit, setVisit] = useState<any | null>(null);
  const [settings, setSettings] = useState<any | null>(null);
  const markedPrintedRef = useRef(false);

  const uploadBaseUrl = import.meta.env.VITE_UPLOAD_BASE_URL || window.location.origin;
  const logoSrc = useMemo(() => {
    if (!settings?.logoPath) return null;
    return `${uploadBaseUrl}${settings.logoPath}`;
  }, [settings?.logoPath, uploadBaseUrl]);

  useEffect(() => {
    document.body.setAttribute("data-print-format", "a4");
    return () => {
      document.body.removeAttribute("data-print-format");
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [visitRes, settingsRes] = await Promise.all([visitApi.get(visitId), settingsApi.get()]);
        setVisit(visitRes.data.data);
        setSettings(settingsRes.data.data);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    if (visitId) {
      load();
    }
  }, [visitId]);

  useEffect(() => {
    const markPrinted = async () => {
      if (!visit?.prescription?.id || markedPrintedRef.current) return;
      markedPrintedRef.current = true;
      try {
        await prescriptionApi.markPrinted(visit.prescription.id);
      } catch {
        // non-blocking for print
      }
    };

    markPrinted();
  }, [visit?.prescription?.id]);

  if (loading) {
    return <Loader text="Loading prescription..." />;
  }

  if (!visit || !settings) {
    return <div className="p-6">Prescription record not found.</div>;
  }

  if (!visit.invoice || Number(visit.invoice.dueAmount || 0) > 0) {
    return <div className="p-6">Prescription print is allowed only after full payment.</div>;
  }

  if (!visit.prescription) {
    return <div className="p-6">Prescription not available for this visit yet.</div>;
  }

  const rawVitals = (visit as any).vitals || {};
  const pulse = fieldOrBlank(rawVitals.pulse);
  const temp = fieldOrBlank(rawVitals.temperature || rawVitals.temp);
  const bp = fieldOrBlank(rawVitals.bp || (rawVitals.bpSystolic && rawVitals.bpDiastolic ? `${rawVitals.bpSystolic}/${rawVitals.bpDiastolic}` : ""));
  const spo2 = fieldOrBlank(rawVitals.spo2);
  const weight = fieldOrBlank(rawVitals.weight);

  return (
    <div className="mx-auto max-w-5xl space-y-4 prescription-print-shell">
      <div className="print-controls no-print flex items-center justify-between rounded-xl border bg-white p-4 shadow-panel">
        <div>
          <h1 className="text-lg font-semibold">Prescription Sheet</h1>
          <p className="text-sm text-slate-500">A4 OP Case Sheet Style</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => window.print()}>Print Prescription</Button>
          <Link to="/prescriptions"><Button variant="secondary">Back</Button></Link>
        </div>
      </div>

      <article className="print-sheet-a4 prescription-sheet">
        <div className="prescription-header-band" />

        <header className="prescription-header">
          <div className="prescription-header-left">
            <div className="prescription-logo-box">
              {logoSrc ? <img src={logoSrc} alt="SIMS Hospital Logo" className="prescription-logo" /> : null}
            </div>
            <div>
              <h2 className="prescription-hospital-name">{settings.hospitalName || "SIMS Hospital"}</h2>
              <p className="prescription-hospital-meta">{settings.address || "Hospital Address"}</p>
              <p className="prescription-hospital-meta">Email: info@simshospital.com</p>
              <p className="prescription-hospital-meta">Contact: {settings.phone || "-"}</p>
            </div>
          </div>
          <div className="prescription-doctor-block">
            <p className="prescription-doctor-name">Dr. {visit.doctor.name}</p>
            <p>{visit.doctor?.doctorProfile?.qualification || ""}</p>
            <p>{visit.doctor?.doctorProfile?.specialization || ""}</p>
          </div>
        </header>

        <section className="prescription-patient-grid">
          <div className="line-field"><span className="label">Patient Name:</span> <span className="line-fill">{visit.patient.name}</span></div>
          <div className="line-field"><span className="label">Date:</span> <span className="line-fill">{new Date(visit.scheduledAt).toLocaleDateString()}</span></div>
          <div className="line-field"><span className="label">Age / Gender:</span> <span className="line-fill">{visit.patient.age || ""} / {visit.patient.gender || ""}</span></div>
          <div className="line-field"><span className="label">MRN:</span> <span className="line-fill">{visit.patient.mrn || ""}</span></div>

          <div className="line-field"><span className="label">Pulse:</span> <span className="line-fill">{pulse}</span><span className="suffix">/Min.</span></div>
          <div className="line-field"><span className="label">Temp:</span> <span className="line-fill">{temp}</span><span className="suffix">°C</span></div>
          <div className="line-field"><span className="label">B.P:</span> <span className="line-fill">{bp}</span></div>
          <div className="line-field"><span className="label">SPO2:</span> <span className="line-fill">{spo2}</span><span className="suffix">%</span></div>
          <div className="line-field"><span className="label">Weight:</span> <span className="line-fill">{weight}</span><span className="suffix">Kg</span></div>
        </section>

        <section className="prescription-writing-area">
          <p className="rx-mark">Rx</p>
          <div className="writing-lines" />
          <div className="prescription-subsections">
            <div>
              <p className="sub-head">Advice</p>
              <div className="sub-lines" />
            </div>
            <div>
              <p className="sub-head">Follow-up</p>
              <div className="sub-lines" />
            </div>
          </div>
        </section>

        <footer className="prescription-footer-row">
          <p className="visit-meta">Visit: #{visit.id} | {formatDateTime(visit.scheduledAt)}</p>
          <div className="doctor-sign-box">
            <div className="sign-line" />
            <p>Doctor Signature</p>
          </div>
        </footer>
      </article>
    </div>
  );
};
