[README.md](https://github.com/user-attachments/files/28504794/README.md)
# FRL — Facility & Asset Management Platform

A full-stack web application for managing industrial assets, engineering documents, work orders, and quality audits — with an integrated AI pipeline that converts 2D engineering drawings into 3D CAD models (STEP / STL).

---

## Features

| Module | Description |
|--------|-------------|
| **Asset Registry** | Track physical assets with full metadata and history |
| **Documents** | Upload and manage engineering drawings (PDF / image) |
| **Drawing → 3D AI** | Automatically convert 2D plans to 3D STEP/STL using Gemini Vision + CadQuery |
| **Conversions** | Track all AI conversion jobs with status and download links |
| **Work Orders** | Create and assign maintenance / inspection tasks |
| **Quality Audits** | Log anomalies and corrective actions |
| **User Management** | Role-based access (Admin / Engineer / Viewer) with JWT auth |

---

## Tech Stack

**Backend**
- Python 3.12 + Django 6 + Django REST Framework
- SimpleJWT for authentication
- Google Gemini 2.5 Flash (Vision AI) for drawing analysis
- CadQuery for parametric 3D model generation
- OpenCV for engineering drawing preprocessing
- SQLite (dev) — swap to PostgreSQL for production

**Frontend**
- React 18 + TypeScript
- Vite dev server
- Zustand for state management

---

## Project Structure

```
FRL/
├── backend/
│   ├── frl/                    # Django project settings & URLs
│   ├── users_app/              # Auth, roles, JWT
│   ├── assets_app/             # Asset CRUD
│   ├── documents_app/          # File upload & management
│   ├── conversions_app/        # Drawing → 3D pipeline
│   │   └── beta_gen3d/         # AI core (Gemini + CadQuery)
│   ├── quality_app/            # Anomalies & audits
│   ├── audit_app/              # Activity logging
│   ├── requirements.txt
│   └── manage.py
└── frontend/
    └── src/
        ├── pages/              # Dashboard, Assets, Documents, …
        ├── components/
        ├── api/                # Axios API layer
        └── store/              # Zustand stores
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

### 1. Clone the repo

```bash
git clone https://github.com/tahaprof/FRL.git
cd FRL
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
```

Create a `.env` file in `backend/`:

```env
SECRET_KEY=your-django-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
GEMINI_API_KEY_1=your-gemini-api-key
# GEMINI_API_KEY_2=optional-second-key-for-quota
```

Run migrations and start the server:

```bash
python manage.py migrate
python manage.py createsuperuser   # optional
python manage.py runserver
```

Backend runs at **http://127.0.0.1:8000**

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**

### 4. Quick launch (Windows)

Double-click **`run_all.bat`** in the project root — it opens both servers in separate terminal windows automatically.

---

## AI Drawing → 3D Pipeline

Upload any 2D engineering drawing (PDF or image). The pipeline:

1. **Preprocesses** the image (CLAHE + sharpening via OpenCV)
2. **Splits views** — detects and separates top view from section/side view
3. **Analyzes** with Gemini Vision — extracts part type, dimensions, bolt patterns
4. **Generates** parametric CadQuery Python code
5. **Builds** the 3D model → exports STEP + STL
6. **Verifies** the result against the original drawing (scores 0–100)
7. **Retries** with targeted fix prompts if score < 80

Supported part types: cylinders, flanged hubs, stepped shafts, rectangular blocks, polygonal flanges, and more.

API endpoint: `POST /api/conversions/convert_plan/` (multipart form, field: `file`)

---

## API Docs

Interactive Swagger UI available at:

```
http://127.0.0.1:8000/api/schema/swagger-ui/
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | Yes | Django secret key |
| `DEBUG` | No | `True` for development |
| `ALLOWED_HOSTS` | Yes | Comma-separated hostnames |
| `CORS_ALLOWED_ORIGINS` | Yes | Frontend origin(s) |
| `GEMINI_API_KEY_1` | Yes | Primary Gemini API key |
| `GEMINI_API_KEY_2` | No | Fallback key for quota rotation |

---

## License

MIT
