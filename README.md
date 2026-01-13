# BridgeTime

A Progressive Web App (PWA) for employee time tracking, built as a TSheets replacement for Bridge Art Space. Features hierarchical job selection, interruption tracking, and Gusto payroll integration.

## Features

- **Mobile-first PWA**: Install on any device, works offline
- **Clock in/out**: Simple time tracking with job selection
- **Hierarchical jobs**: Categories with optional sub-jobs (e.g., WRP properties)
- **Interruption tracking**: Pause current work, handle interruption, resume automatically
- **Gusto integration**: Sync employees and export hours to payroll
- **Admin interface**: View and edit time entries

## Tech Stack

- **Backend**: Django 5.x, Django REST Framework, SQLite
- **Frontend**: React 19, TypeScript, Vite, TanStack Query
- **Deployment**: WhiteNoise for static files, Gunicorn

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env  # Edit with your settings

# Initialize database
python manage.py migrate
python manage.py import_job_codes ../data/bridgeartspace_job_codes_2026-01-10.csv
python manage.py create_sample_employees  # Optional: for testing

# Start server
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at http://localhost:5173 (frontend) and http://localhost:8000 (API).

## Environment Variables

Create a `.env` file in the `backend/` directory:

```
SECRET_KEY=your-secret-key
DEBUG=True
GUSTO_CLIENT_ID=your-client-id
GUSTO_CLIENT_SECRET=your-client-secret
GUSTO_ACCESS_TOKEN=your-access-token
GUSTO_COMPANY_ID=your-company-id
```

## API Endpoints

All endpoints under `/api/v1/`:

| Endpoint | Description |
|----------|-------------|
| `GET /employees/` | List active employees |
| `GET /employees/{id}/current_entry/` | Get employee's active time entry |
| `GET /jobs/categories/` | List job categories with nested codes |
| `POST /clock/start/` | Start clocking into a job |
| `POST /clock/stop/` | Stop current time entry |
| `POST /clock/interrupted-start/` | Pause current job, start interruption |
| `POST /clock/interrupted-stop/` | End interruption, resume paused job |
| `GET/POST /time-entries/` | List/create time entries (admin) |

## Development

### Running Tests

```bash
# Backend
cd backend
python manage.py test

# Frontend
cd frontend
npm run test:run
```

### Building for Production

```bash
cd frontend
npm run build  # Output to backend/staticfiles/frontend/
```

## License

Private - Bridge Art Space
