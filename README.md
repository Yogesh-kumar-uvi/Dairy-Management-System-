# Dairy Milk Collection & Hisab-Kitab Management System

MERN stack (MongoDB, Express, React, Node.js) system with a **Neumorphism UI** for dairy owners to record twice-daily milk collection, auto-calculate payments via a Fat-SNF rate chart, and maintain a running ledger (hisab-kitab) per customer.

## Features

- **Customers**: add/edit/soft-delete, immutable customer code, search + pagination
- **Milk Entry**: morning/evening sessions, Fat/SNF/CLR, rate auto-fill from admin-configurable **Fat-SNF Rate Chart**, live amount preview, filters, daily/monthly summaries
- **Ledger / Hisab-Kitab**: payments (Cash/UPI/Bank), date-wise running balance, outstanding dues dashboard, printable statement
- **Reports**: daily & monthly summaries, CSV export, print/PDF
- **Auth & Roles**: Admin / Operator RBAC, JWT in **httpOnly cookies**, refresh token rotation, forgot/reset password via email
- **Security**: helmet, CORS whitelist, express-validator, mongo-sanitize, rate limiting, bcrypt (12 rounds), server-side amount calculation, audit fields (createdBy/updatedBy)

## Project Structure

```
backend/    Express + Mongoose REST API (models, routes, middleware, utils)
frontend/   React (Vite) app with Neumorphism UI
```

## Run Locally

### Prerequisites
- Node.js 18+
- MongoDB local install or MongoDB Atlas URI

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # put your MONGO_URI and JWT secrets in .env
npm run dev            # http://localhost:5000
```

### 2. Frontend (new terminal)

```bash
cd frontend
npm install
npm run dev            # http://localhost:3000
```

### 3. First-time admin setup
Open http://localhost:3000/login and click **"First time setup? Create admin"** to create the first admin account (works only when no users exist). Admin can then create operators via `POST /api/auth/register`.

## Deployment

- **Frontend (Vercel)**: root dir `frontend`, build `npm run build`, output `dist`. Set env `VITE_API_URL=https://<your-render-app>.onrender.com/api`
- **Backend (Render)**: root dir `backend`, start `npm start`. Set all `.env` values, `NODE_ENV=production`, and `CLIENT_URLS=https://<your-vercel-app>.vercel.app`
- **MongoDB Atlas**: create cluster, add DB user with strong password, IP whitelist Render's IPs (or 0.0.0.0/0 with strong credentials), put connection string in `MONGO_URI`

> In production, cookies are set with `Secure; SameSite=None` because frontend (Vercel) and backend (Render) are on different domains. CSRF exposure is mitigated by the strict CORS origin whitelist with credentials.

## Key API Endpoints

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/bootstrap` | first admin only |
| POST | `/api/auth/login` / `logout` / `refresh` | public/auth |
| POST | `/api/auth/forgot-password`, `/reset-password/:token` | public |
| GET/POST/PUT/DELETE | `/api/customers` | auth (delete: admin) |
| GET/POST/PUT/DELETE | `/api/milk-entries` | auth (edit/delete: admin) |
| GET | `/api/milk-entries/summary/daily` / `monthly` | admin |
| GET/POST/PUT/DELETE | `/api/rate-chart` (+ `/lookup`) | auth (write: admin) |
| POST/GET | `/api/payments`, `/ledger/:customerId`, `/outstanding/all` | admin |
| GET | `/api/dashboard/stats` | auth |
