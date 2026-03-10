# SIMS Hospital

SIMS Hospital is a local-first hospital management system with:

- React + Vite + TypeScript frontend
- Node + Express + TypeScript backend
- SQLite + Prisma
- Electron desktop wrapper + Windows installer (NSIS)

## Monorepo Structure

```text
.
|-- backend/
|-- frontend/
|-- desktop-electron/
|-- docs/
|-- INSTALL.md
`-- package.json
```

## Web Development

```powershell
npm install
npm run dev:backend
npm run dev:frontend
```

## Desktop Installer Build (Windows)

```powershell
npm install
npm run build:frontend
npm run build:backend
npm run build:win
```

Output:

- `dist/installer/SIMS-Hospital-Setup-<version>.exe`

## Default Runtime Storage (Desktop App)

- `%APPDATA%\\SIMS Hospital\\data\\sims.db`
- `%APPDATA%\\SIMS Hospital\\uploads\\`
- `%APPDATA%\\SIMS Hospital\\logs\\`

## Initial Admin (Auto-seeded on first launch)

- Username: `admin`
- Password: `Admin@12345`
- Password change is enforced at first login.

## Additional Guides

- Build/install guide: `INSTALL.md`
- Staff guide: `docs/USER_GUIDE.md`
- Backup guide: `docs/BACKUP_GUIDE.md`
