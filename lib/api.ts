const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const BASE = `${API_URL}/api/v1`;

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
  return res.json();
}

export const api = {
  // Appointments
  getAppointments: () => req<Appointment[]>("/appointments"),
  getAppointment: (id: number) => req<Appointment>(`/appointments/${id}`),
  updateAppointment: (id: number, data: Partial<Appointment>) =>
    req<Appointment>(`/appointments/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  updateAppointmentAdmin: (id: number, status: string) =>
  req(`/admin/appointments/${id}/status`, { 
    method: "PUT", 
    body: JSON.stringify({ status }) 
  }),

  // Patients
  getPatients: () => req<Patient[]>("/patients"),
  getPatient: (id: number) => req<Patient>(`/patients/${id}`),

  // Specialists
  getSpecialists: () => req<Specialist[]>("/specialists"),
  updateSpecialist: (id: number, data: Partial<Specialist>) =>
    req<Specialist>(`/specialists/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  // Services
  getServices: () => req<Service[]>("/services"),
  updateService: (id: number, data: Partial<Service>) =>
    req<Service>(`/services/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  // Payments
  getPayments: () => req<Payment[]>("/payments"),

  // Clinical Records
  getClinicalRecords: () => req<ClinicalRecord[]>("/clinical-records"),
  createClinicalRecord: (data: Partial<ClinicalRecord>) =>
    req<ClinicalRecord>("/clinical-records", { method: "POST", body: JSON.stringify(data) }),
};

// ── TYPES ──────────────────────────────────────────────
export interface Appointment {
  id: number;
  patient_id: number;
  patient: Patient;
  specialist_id: number;
  specialist: Specialist;
  service_id: number;
  service?: Service;
  start_time: string;
  end_time: string;
  status: "pending" | "scheduled" | "completed" | "cancelled";
  historical_price: number;
  notes?: string;
  modification_count: number;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  document_number: string;
  phone: string;
  email: string;
  emergency_contact_name?: string;
  created_at: string;
}

export interface Specialist {
  id: number;
  first_name: string;
  last_name: string;
  specialty: string;
  license_number: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: number;
  category_id: number;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
}

export interface Payment {
  id: number;
  patient: Patient;
  service: Service;
  amount: number;
  payment_date: string;
  payment_method: string;
  status: "paid" | "pending" | "refunded";
  created_at: string;
}

export interface ClinicalRecord {
  id: number;
  patient_id: number;
  patient?: Patient;
  specialist_id: number;
  specialist?: Specialist;
  attention_date: string;
  next_appointment?: string;
  reason: string;
  medical_history?: string;
  clinical_exam?: string;
  diagnosis: string;
  treatment?: string;
  observations?: string;
  created_at: string;
}
