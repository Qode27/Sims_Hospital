export type Role = "ADMIN" | "RECEPTION" | "DOCTOR";

export type DoctorProfile = {
  id: number;
  userId: number;
  qualification: string;
  specialization: string;
  registrationNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  signaturePath?: string | null;
};

export type User = {
  id: number;
  name: string;
  username: string;
  role: Role;
  active?: boolean;
  forcePasswordChange: boolean;
  doctorProfile?: DoctorProfile | null;
};

export type Patient = {
  id: number;
  mrn: string;
  name: string;
  age?: number | null;
  dob?: string | null;
  gender: "MALE" | "FEMALE" | "OTHER";
  phone: string;
  address: string;
  idProof?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Visit = {
  id: number;
  patientId: number;
  doctorId: number;
  type: "OPD" | "IPD";
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  consultationFee: number;
  reason?: string | null;
  scheduledAt: string;
  completedAt?: string | null;
  createdAt: string;
  patient: Patient;
  doctor: { id: number; name: string; doctorProfile?: DoctorProfile | null };
  invoice?: {
    id: number;
    invoiceNo: string;
    total: number;
    paidAmount: number;
    dueAmount: number;
  } | null;
  ipdAdmission?: IPDAdmission | null;
  opdToIpdTransfer?: OpdToIpdTransfer | null;
};

export type OpdToIpdTransfer = {
  id: number;
  opdVisitId: number;
  ipdAdmissionId: number;
  patientId: number;
  transferredById: number;
  notes?: string | null;
  createdAt: string;
};

export type IPDAdmission = {
  id: number;
  visitId: number;
  patientId: number;
  attendingDoctorId: number;
  status: "ADMITTED" | "DISCHARGED";
  admittedAt: string;
  dischargedAt?: string | null;
  ward: string;
  room: string;
  bed: string;
  diagnosis?: string | null;
  reason?: string | null;
  createdAt: string;
  patient: Patient;
  visit: Visit;
  transfer?: OpdToIpdTransfer | null;
  attendingDoctor: {
    id: number;
    name: string;
    doctorProfile?: DoctorProfile | null;
  };
};

export type Prescription = {
  id: number;
  patientId?: number | null;
  visitId: number;
  doctorId: number;
  invoiceId?: number | null;
  printedAt?: string | null;
  templateType: string;
  notes?: string | null;
  symptoms?: string | null;
  diagnosis?: string | null;
  advice?: string | null;
  itemsJson: string;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceItem = {
  id?: number;
  category: "CONSULTATION" | "LAB" | "PROCEDURE" | "MEDICINE" | "MISC";
  name: string;
  qty: number;
  unitPrice: number;
  discount: number;
  tax: number;
  amount: number;
};

export type Invoice = {
  id: number;
  visitId: number;
  invoiceNo: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
  paymentMode: "CASH" | "UPI" | "CARD";
  notes?: string | null;
  createdAt: string;
  items: InvoiceItem[];
  visit: Visit;
};

export type HospitalSettings = {
  id: number;
  hospitalName: string;
  address: string;
  phone: string;
  gstin?: string | null;
  logoPath?: string | null;
  kansaltLogoPath?: string | null;
  defaultConsultationFee: number;
  invoicePrefix: string;
  invoiceSequence: number;
  footerNote?: string | null;
};
