# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BridgeTime is a TSheets replacement for Bridge Art Space - a PWA for employee time tracking with Gusto payroll integration. Employees clock in/out of jobs via mobile, with hierarchical job selection and interruption tracking.

**Tech Stack**: Django 5.x + DRF backend, React 18 + TypeScript + Vite frontend, SQLite database.

## Development Commands

### Backend (Django)
```bash
cd backend
source venv/bin/activate
python manage.py runserver              # Start dev server (port 8000)
python manage.py test                   # Run all tests
python manage.py test api.tests.TestClassName  # Run specific test class
python manage.py makemigrations && python manage.py migrate  # Database migrations
python manage.py import_job_codes ../data/bridgeartspace_job_codes_2026-01-10.csv  # Seed job codes
python manage.py create_sample_employees  # Create test employees
```

### Frontend (React/Vite)
```bash
cd frontend
npm run dev          # Start dev server (port 5173)
npm run build        # Production build
npm run lint         # ESLint
npm run test:run     # Run tests once
npm run test         # Run tests in watch mode
```

## Architecture

### Data Model Hierarchy

```
Employee (synced from Gusto)
    ↓ clocks into
TimeEntry
    ↓ references either
JobCodeCategory (Level 0: WRP, Events, Kitchen, etc.)
    ↓ optionally has
JobCode (Level 1: WRP sub-properties like "HEN - Hensley")
```

- Most categories are standalone (Events, Kitchen, Dog Sitting)
- WRP is the only category with sub-jobs (property codes)
- TimeEntry can reference either a JobCodeCategory OR a JobCode

### Interruption System

TimeEntry has special fields for the interruption workflow:
- `is_interruption`: marks this as an interruption entry
- `interrupted_entry`: FK to the paused entry
- `is_paused`: whether currently paused by an interruption
- `interruption_reason`: text explaining why

Flow: INTERRUPTED START pauses current entry, creates new interruption entry. INTERRUPTED STOP closes interruption and resumes original entry.

### API Structure

All endpoints under `/api/v1/`:
- `employees/` - list active employees, `{id}/current_entry/` for active timer
- `jobs/categories/` - hierarchical job listing with nested job_codes
- `clock/start|stop|interrupted-start|interrupted-stop/` - clock actions
- `time-entries/` - CRUD for admin editing (filterable by employee, job_category, start_date, end_date)

### Frontend Structure

- `src/api/client.ts` - Axios-based API client
- `src/hooks/useApi.ts` - TanStack Query hooks for all API operations
- `src/components/` - React components (TimeClock, JobSelect, EmployeeSelect, etc.)
- `src/pages/` - Page components (ClockPage, AdminPage)

## Key Business Rules

1. **Single active job**: Starting a new job auto-stops the previous one
2. **Single-level interruptions**: Cannot interrupt an interruption
3. **No login required**: Employees select name from dropdown (trust-based system)
4. **Gusto is source of truth**: Employees synced from Gusto, hours exported back

## Environment Variables

Backend `.env`:
```
SECRET_KEY, DEBUG, GUSTO_CLIENT_ID, GUSTO_CLIENT_SECRET, GUSTO_ACCESS_TOKEN, GUSTO_COMPANY_ID
```
