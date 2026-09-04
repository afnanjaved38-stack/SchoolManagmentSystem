# EduPulse (Hackathon Project)

**Alkhidmat / Bano Qabil AI Hackathon submission**

**Hackathon project name:** EduPulse  
**Software product:** CampusCore — School Management Platform

CampusCore is a school ERP for principals, teachers, students, and parents — plus an AI Learning Companion with classroom-ready visual diagrams (Google Gemini). This repository is submitted to the hackathon under the project name **EduPulse**.

**Live demo:** https://school.72-60-209-248.sslip.io  
**Repo:** https://github.com/afnanjaved38-stack/SchoolManagmentSystem

---

## Live demo (try first)

| | |
|--|--|
| **URL** | https://school.72-60-209-248.sslip.io |
| **Admin** | `afnanjaved38@gmail.com` / `Admin123` |

**Teachers:** seeded portal accounts use password `Teacher123` (emails printed by `node seed_school.js --fresh`, e.g. `aqsa.yaseen@school.demo`).  
**Students / Parents:** create logins in Admin → Students (same production flow — not hardcoded).

---

## Problem

Many schools still run on paper registers, WhatsApp groups, and scattered spreadsheets. That creates missed attendance/fee disputes, slow parent communication, overloaded teachers, and students who need help outside class hours.

## Solution

**CampusCore** is a role-based School Management System (submitted as **EduPulse** for this hackathon):

| Role | What they get |
|------|----------------|
| **Admin / Principal** | Classes, students, teachers, finance, sessions, holidays, AI Control Center |
| **Teacher** | Attendance, diary, assignments, class tests, substitutions, AI Teaching Suite |
| **Student** | Attendance, diary, assignments, fees, **AI Learning Companion** with diagrams |
| **Parent** | Linked child progress, fees, diary |

## Impact

- One platform for academics + operations + AI tutoring
- Visual Mermaid diagrams for Grade 5–10 science/math concepts
- Central Gemini API key (admin-managed)
- Models **auto-sync** when an API key is saved/tested; default model is **`gemini-3.5-flash`**

## What is built

- Role-based auth and dashboards
- Classes, sections, students, teachers (class teacher per section)
- Student & teacher attendance
- Fee records / vouchers
- Diary, assignments, class tests, exams (terms + results)
- Academic years, holidays, substitutions, session manager
- Complaints & student promotion
- **AI Control Center**, **Student AI Chat**, **Teacher AI Assistant**

## Demo seed data (`node seed_school.js --fresh`)

- ~**300 students** across Play Group → Class 10
- Class teacher assigned to **every section**
- **Last 5 months:** attendance, fee vouchers, diaries, assignments, class tests
- **2 exam terms** conducted with published subject marks
- Teachers with portal logins (password `Teacher123`)
- Student/Parent portal users: create via Admin UI

## Tech stack

- **Frontend:** React 18, Tailwind CSS, Chart.js, Mermaid, Axios
- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT, bcrypt
- **AI:** Google Gemini (`gemini-3.5-flash` by default)

## Quick start (local)

```bash
git clone https://github.com/afnanjaved38-stack/SchoolManagmentSystem.git
cd SchoolManagmentSystem
npm run install-all

cd backend
copy .env.example .env

node add_admin.js
node seed_school.js --fresh

cd ..
npm run dev
```

- App: http://localhost:3000  
- API: http://localhost:5000  
- Admin: `afnanjaved38@gmail.com` / `Admin123`

### Production build

```bash
cd frontend && npm run build && cd ..
cd backend && npm start
```

## Environment

See [`backend/.env.example`](backend/.env.example). Never commit a real `.env`.

## Security (hackathon checklist)

- Repo is **public** for judges to review
- `.env` / `.env.*` gitignored; only `.env.example` committed
- No live Gemini API keys in source
- Demo admin password is intentional for judges

## Ownership

This project is **proprietary** (not open source). See [`LICENSE`](LICENSE).  
Published publicly only for hackathon judging under the project name **EduPulse**.

## Repository

https://github.com/afnanjaved38-stack/SchoolManagmentSystem

---

**EduPulse** — Hackathon project · **CampusCore** — School ERP + AI Learning Companion
