# Architecture

## Runtime Shape

The production HMS is split into:

- `frontend/`: staff-facing SPA for reception, doctors, billing, pharmacy, and admin workflows
- `backend/`: API, RBAC, validation, audit logging, reporting, and print data preparation
- `backend/prisma/`: relational healthcare domain and migration history

## Domain Model

Core entities:

- `Patient`, `Visit`, `Prescription`
- `Invoice`, `InvoiceItem`, `Payment`
- `IPDAdmission`, `Room`, `Bed`, `OpdToIpdTransfer`
- `User`, `DoctorProfile`, `Permission`, `RolePermission`
- `AuditLog`, `HospitalSettings`

This supports:

- patient registration
- consultation billing
- split payment collection
- prescription eligibility after billing
- OPD to IPD admission with real bed allocation
- revenue and occupancy reporting

## API Structure

Modules:

- `auth`
- `patients`
- `visits`
- `ipd`
- `invoices`
- `prescriptions`
- `doctors`
- `users`
- `settings`
- `rooms`
- `reports`

Shared layers:

- `middleware/`: auth, validation, centralized error handling
- `services/`: billing math, audit logs, permissions, reports, bed occupancy rules
- `utils/`: ids, pagination, JWT, async wrappers, in-memory cache

## Security Model

- JWT authentication
- role-based access control
- permissions metadata table for future policy expansion
- password hashing with bcrypt
- audit logging for auth, billing, visit state changes, and admissions
- friendly server errors in non-development environments

## Performance Notes

- indexed relational schema for patients, visits, invoices, admissions, and logs
- cached dashboard and report endpoints
- paginated list endpoints
- aggregated reporting queries using Prisma group-by and database filters

## Deployment Pattern

- multi-stage Docker build
- backend serves `frontend/dist` in production
- persistent volumes for data, uploads, and logs
- GitHub Actions CI and Azure pipeline examples included under `deployment/`
