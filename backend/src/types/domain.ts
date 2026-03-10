export const USER_ROLES = ["ADMIN", "RECEPTION", "DOCTOR"] as const;
export type UserRoleValue = (typeof USER_ROLES)[number];

export const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
export type GenderValue = (typeof GENDERS)[number];

export const VISIT_TYPES = ["OPD", "IPD"] as const;
export type VisitTypeValue = (typeof VISIT_TYPES)[number];

export const VISIT_STATUSES = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export type VisitStatusValue = (typeof VISIT_STATUSES)[number];

export const IPD_ADMISSION_STATUSES = ["ADMITTED", "DISCHARGED"] as const;
export type IpdAdmissionStatusValue = (typeof IPD_ADMISSION_STATUSES)[number];

export const PAYMENT_MODES = ["CASH", "UPI", "CARD"] as const;
export type PaymentModeValue = (typeof PAYMENT_MODES)[number];

export const INVOICE_ITEM_CATEGORIES = ["CONSULTATION", "LAB", "PROCEDURE", "MEDICINE", "MISC"] as const;
export type InvoiceItemCategoryValue = (typeof INVOICE_ITEM_CATEGORIES)[number];
