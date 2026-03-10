import { api } from "./client";
import type { HospitalSettings, IPDAdmission, Invoice, Patient, Prescription, User, Visit } from "../types";

export const authApi = {
  login: (payload: { username: string; password: string }) =>
    api.post<{ token: string; user: User }>("/auth/login", payload),
  me: () => api.get<{ user: User }>("/auth/me"),
  changePassword: (payload: { oldPassword: string; newPassword: string }) =>
    api.post("/auth/change-password", payload),
};

export const userApi = {
  list: () => api.get<{ data: User[] }>("/users"),
  create: (payload: { name: string; username: string; role: string; password: string }) =>
    api.post("/users", payload),
  update: (id: number, payload: Partial<{ name: string; role: string; active: boolean }>) =>
    api.patch(`/users/${id}`, payload),
  resetPassword: (id: number, password: string) => api.post(`/users/${id}/reset-password`, { password }),
};

export const doctorApi = {
  list: (params?: { active?: boolean; q?: string }) =>
    api.get<{ data: User[] }>("/doctors", {
      params: {
        active: params?.active === undefined ? undefined : String(params.active),
        q: params?.q,
      },
    }),
  create: (payload: {
    fullName: string;
    qualification: string;
    specialization: string;
    registrationNumber?: string | null;
    phone?: string | null;
    email?: string | null;
    username: string;
    password: string;
    active?: boolean;
  }) => api.post("/doctors", payload),
  update: (
    id: number,
    payload: Partial<{
      fullName: string;
      qualification: string;
      specialization: string;
      registrationNumber?: string | null;
      phone?: string | null;
      email?: string | null;
      username: string;
      password: string;
      active: boolean;
    }>,
  ) => api.patch(`/doctors/${id}`, payload),
  uploadSignature: (id: number, file: File) => {
    const formData = new FormData();
    formData.append("signature", file);
    return api.post(`/doctors/${id}/signature`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};

export const patientApi = {
  list: (params: { q?: string; page?: number; pageSize?: number; active?: boolean }) =>
    api.get<{ data: Patient[]; pagination: { total: number; page: number; totalPages: number } }>("/patients", {
      params,
    }),
  get: (id: number) =>
    api.get<{ data: Patient & { visits: Visit[]; ipdAdmissions?: IPDAdmission[]; prescriptions?: Prescription[] } }>(`/patients/${id}`),
  create: (payload: {
    name: string;
    age?: number;
    dob?: string | null;
    gender: string;
    phone: string;
    address: string;
    idProof?: string | null;
  }) => api.post<{ data: Patient }>("/patients", payload),
  update: (
    id: number,
    payload: {
      name: string;
      age?: number;
      dob?: string | null;
      gender: string;
      phone: string;
      address: string;
      idProof?: string | null;
    },
  ) => api.put<{ data: Patient }>(`/patients/${id}`, payload),
  archive: (id: number) => api.delete(`/patients/${id}`),
};

export const visitApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<{ data: Visit[]; pagination: { total: number; page: number; totalPages: number } }>("/visits", { params }),
  get: (id: number) =>
    api.get<{
      data: Visit & {
        notes: Array<{ id: number; text: string; createdAt: string; doctor: { name: string } }>;
        prescription?: {
          itemsJson: string;
          symptoms?: string | null;
          diagnosis?: string | null;
          advice?: string | null;
        } | null;
      };
    }>(`/visits/${id}`),
  create: (payload: Record<string, unknown>) => api.post<{ data: Visit }>("/visits", payload),
  updateStatus: (id: number, status: string) => api.patch(`/visits/${id}/status`, { status }),
  addNote: (id: number, text: string) => api.post(`/visits/${id}/notes`, { text }),
  savePrescription: (
    id: number,
    payload: {
      symptoms?: string;
      diagnosis?: string;
      advice?: string;
      items: Array<Record<string, unknown>>;
    },
  ) => api.put(`/visits/${id}/prescription`, payload),
  transferToIpd: (
    id: number,
    payload: {
      attendingDoctorId?: number;
      ward: string;
      room: string;
      bed: string;
      diagnosis?: string;
      reason?: string;
      notes?: string;
      admittedAt?: string;
    },
  ) => api.post(`/visits/${id}/transfer-to-ipd`, payload),
};

export const ipdApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<{ data: IPDAdmission[]; pagination: { total: number; page: number; totalPages: number } }>("/ipd", { params }),
  get: (id: number) => api.get<{ data: IPDAdmission }>(`/ipd/${id}`),
  create: (payload: {
    patientId: number;
    attendingDoctorId: number;
    ward: string;
    room: string;
    bed: string;
    diagnosis?: string;
    reason?: string;
    admittedAt?: string;
  }) => api.post<{ data: IPDAdmission }>("/ipd", payload),
  update: (
    id: number,
    payload: Partial<{
      attendingDoctorId: number;
      ward: string;
      room: string;
      bed: string;
      diagnosis: string | null;
      reason: string | null;
    }>,
  ) => api.patch<{ data: IPDAdmission }>(`/ipd/${id}`, payload),
  discharge: (id: number, payload?: { dischargeNote?: string; dischargedAt?: string }) =>
    api.post<{ data: IPDAdmission }>(`/ipd/${id}/discharge`, payload ?? {}),
};

export const invoiceApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<{ data: Invoice[]; pagination: { total: number; page: number; totalPages: number } }>("/invoices", {
      params,
    }),
  get: (id: number) => api.get<{ data: Invoice; settings: HospitalSettings }>(`/invoices/${id}`),
  create: (payload: Record<string, unknown>) =>
    api.post<{ data: Invoice & { prescription?: { id: number; visitId: number } | null } }>("/invoices", payload),
};

export const prescriptionApi = {
  list: (params?: { patientId?: number; visitId?: number }) =>
    api.get<{ data: Array<Prescription & {
      patient?: { id: number; name: string; mrn: string; age?: number | null; gender: string } | null;
      doctor: { id: number; name: string; doctorProfile?: { qualification?: string; specialization?: string; signaturePath?: string | null } | null };
      visit: { id: number; scheduledAt: string; status: string; type: string };
      invoice?: { id: number; invoiceNo: string; dueAmount: number } | null;
    }> }>("/prescriptions", { params }),
  markPrinted: (id: number) => api.post(`/prescriptions/${id}/mark-printed`),
};

export const settingsApi = {
  getPublic: () => api.get<{ data: Pick<HospitalSettings, "id" | "hospitalName" | "logoPath" | "kansaltLogoPath"> | null }>("/settings/public"),
  get: () => api.get<{ data: HospitalSettings }>("/settings"),
  update: (payload: Record<string, unknown>) => api.put<{ data: HospitalSettings }>("/settings", payload),
  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append("logo", file);
    return api.post<{ data: HospitalSettings }>("/settings/logo", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
  uploadKansaltLogo: (file: File) => {
    const formData = new FormData();
    formData.append("logo", file);
    return api.post<{ data: HospitalSettings }>("/settings/kansalt-logo", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};
