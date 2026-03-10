# SIMS Hospital Backup and Restore Guide

## Runtime Data Paths

- Database: `%APPDATA%\SIMS Hospital\data\sims.db`
- Uploads: `%APPDATA%\SIMS Hospital\uploads\`
- Logs: `%APPDATA%\SIMS Hospital\logs\`

## Daily Backup

1. Close SIMS Hospital (recommended).
2. Copy DB and uploads folders to backup location.
3. Keep backups by date.

Example destination:

- `D:\SIMS_Hospital_Backups\2026-02-21\sims.db`
- `D:\SIMS_Hospital_Backups\2026-02-21\uploads\...`

## Restore

1. Close SIMS Hospital.
2. Replace:
   - `%APPDATA%\SIMS Hospital\data\sims.db`
   - `%APPDATA%\SIMS Hospital\uploads\`
3. Relaunch SIMS Hospital.

## Suggested Frequency

- Small clinic: daily end-of-day backup
- Medium hospital: every 4-6 hours + end-of-day

## Security

- Restrict backup folder access.
- Keep at least one offline/air-gapped backup copy weekly.
