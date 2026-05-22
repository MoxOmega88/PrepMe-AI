# PrepMeAI - Setup Guide

## 🎯 Quick Start

### Option 1: Automated Setup (Recommended)

**Windows:**
```bash
start-dev.bat
```

**Mac/Linux:**
```bash
chmod +x start-dev.sh
./start-dev.sh
```

### Option 2: Manual Setup

#### Frontend Setup
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

#### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Add your GROQ_API_KEY to .env
uvicorn main:app --reload --port 8000
```

## 🔑 Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (.env)
```env
GROQ_API_KEY=your_groq_api_key_here
PDF_PATH=../ncert_science_8.pdf
GROQ_MODEL_PRIMARY=llama-3.3-70b-versatile
GROQ_MODEL_FALLBACK=llama3-70b-8192
```

Get your Groq API key: https://console.groq.com/keys

## 📁 Project Structure

```
prepmeai/
├── frontend/                    # Next.js 14 App
│   ├── app/
│   │   ├── layout.tsx          # Root layout with navbar, sidebar, footer
│   │   ├── page.tsx            # Dashboard page
│   │   └── globals.css         # Global styles + Tailwind
│   ├── components/
│   │   ├── layout/
│   │   │   ├── navbar.tsx      # Top navigation bar
│   │   │   ├── sidebar.tsx     # Collapsible left sidebar
│   │   │   └── footer.tsx      # Footer component
│   │   └── ui/                 # shadcn/ui components
│   ├── lib/
│   │   └── utils.ts            # Utility functions
│   ├── package.json
│   ├── tailwind.config.ts      # Tailwind configuration
│   └── tsconfig.json
│
├── backend/                     # FastAPI App
│   ├── routers/
│   │   ├── __init__.py
│   │   └── health.py           # Health check endpoint
│   ├── models/                 # Pydantic models
│   ├── services/               # Business logic
│   ├── db/                     # Database layer
│   ├── main.py                 # FastAPI app entry
│   ├── config.py               # Configuration
│   └── requirements.txt
│
├── ncert_science_8.pdf         # Study material
├── README.md
└── SETUP.md
```

## 🎨 Design System

### Colors
- **Primary**: #4F46E5 (Indigo) - Main brand color
- **Accent**: #7C3AED (Violet) - Highlights and CTAs
- **Background**: #F9FAFB - Page background
- **Surface**: #FFFFFF - Card backgrounds
- **Text**: #111827 - Primary text
- **Muted**: #6B7280 - Secondary text

### Typography
- **Font**: Inter (Google Fonts)
- **Headings**: Bold, tracking-tight
- **Body**: Regular, antialiased

### Components
All UI components use shadcn/ui with Radix UI primitives:
- Button
- Avatar
- Dropdown Menu
- Separator
- (More to be added as needed)

## 🚀 Development Workflow

1. **Start both servers** using the automated script
2. **Frontend** auto-reloads on file changes (http://localhost:3000)
3. **Backend** auto-reloads on file changes (http://localhost:8000)
4. **API Documentation** available at http://localhost:8000/docs

## 📝 Next Steps

The scaffold is complete with:
- ✅ Clean light theme
- ✅ Responsive layout (navbar, sidebar, footer)
- ✅ Navigation structure
- ✅ FastAPI backend with CORS
- ✅ Health check endpoint

**Ready to add:**
- Dashboard metrics and charts
- AI Tutor chat interface
- Quiz generation and grading
- Study planner calendar
- Analytics visualizations
- Profile settings

## 🐛 Troubleshooting

### Frontend won't start
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Backend won't start
```bash
cd backend
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### CORS errors
Make sure backend is running on port 8000 and frontend on port 3000.

### API key errors
Verify your GROQ_API_KEY is set in `backend/.env`

## 📚 Resources

- [Next.js Docs](https://nextjs.org/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Groq API](https://console.groq.com)
