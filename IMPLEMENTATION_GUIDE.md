# PrepMeAI - Complete Implementation Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [System Requirements](#system-requirements)
3. [Getting Started](#getting-started)
4. [API Keys & Configuration](#api-keys--configuration)
5. [Installation Steps](#installation-steps)
6. [Running the Application](#running-the-application)
7. [Verification & Testing](#verification--testing)
8. [Troubleshooting](#troubleshooting)
9. [Project Structure](#project-structure)

---

## Prerequisites

Before starting, ensure you have:

- **Git** - For cloning the repository
- **Python 3.10+** - For backend
- **Node.js 18+** - For frontend
- **npm or yarn** - Package manager for Node.js
- **Groq Account** - For AI API access (free)

### Verify Your Installation

```bash
# Check Python
python --version
# Expected: Python 3.10.x or higher

# Check Node.js
node --version
# Expected: v18.x or higher

# Check npm
npm --version
# Expected: 9.x or higher

# Check Git
git --version
# Expected: git version 2.x or higher
```

---

## System Requirements

### Minimum (Development)
- **RAM**: 4GB
- **Disk**: 2GB (including PDFs)
- **CPU**: 2 cores

### Recommended (Development)
- **RAM**: 8GB+
- **Disk**: 5GB
- **CPU**: 4+ cores

### Supported Operating Systems
- ✅ macOS (Intel & Apple Silicon)
- ✅ Windows 10/11
- ✅ Linux (Ubuntu 20.04+, Debian, Fedora)

---

## Getting Started

### Step 1: Clone the Repository

```bash
# Clone from GitHub
git clone https://github.com/your-username/prepmeai.git
cd prepmeai

# Or download as ZIP and extract
```

### Step 2: Create API Keys

#### Get Groq API Key (FREE)

1. Go to **[Groq Console](https://console.groq.com/keys)**
2. Sign up with email (or GitHub/Google)
3. Verify your email
4. Click **"Create API Key"**
5. Copy the key (looks like: `gsk_xxxxxxxxxxxxx`)
6. **Keep this safe!** Do NOT commit to git

---

## API Keys & Configuration

### Required API Keys

| Service | Purpose | Cost | Where to Get |
|---------|---------|------|-------------|
| **Groq** | LLM for AI Tutor & Quiz Generation | FREE | https://console.groq.com/keys |

### Optional (For Production)

| Service | Purpose | When Needed |
|---------|---------|------------|
| **PostgreSQL** | Production Database | Deploying to production |
| **AWS S3** | File Storage | Storing user uploads at scale |
| **SendGrid** | Email Service | Sending password resets, notifications |

---

## Installation Steps

### Option A: Automated Setup (Recommended)

#### Windows
```bash
# Run the startup script
start-dev.bat
```

#### macOS/Linux
```bash
# Make script executable
chmod +x start-dev.sh

# Run the startup script
./start-dev.sh
```

**The script will:**
- ✅ Check system requirements
- ✅ Create virtual environments
- ✅ Install dependencies
- ✅ Set up environment files
- ✅ Start both frontend and backend

---

### Option B: Manual Setup (Step-by-Step)

#### Step 1: Set Up Backend

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env and add your Groq API key
# Replace 'your_groq_api_key_here' with your actual key
```

**Backend .env Configuration:**
```env
# REQUIRED: Your Groq API Key
GROQ_API_KEY=gsk_xxxxxxxxxxxxx

# PDF paths for each subject
PDF_SCIENCE_PATH=../ncert_science_8.pdf
PDF_MATHS_PATH=../ncert_maths_8.pdf
PDF_SOCIAL_PATH=../ncert_social_8.pdf
PDF_ENGLISH_PATH=../ncert_english_8.pdf

# Model selection (optional, defaults are good)
GROQ_MODEL_PRIMARY=llama-3.1-70b-versatile
GROQ_MODEL_FALLBACK=llama3-70b-8192

# Database (SQLite default is fine for development)
DATABASE_URL=sqlite+aiosqlite:///./prepmeai.db
```

**Start Backend:**
```bash
# Make sure you're in the backend folder with venv activated
python -m uvicorn main:app --reload --port 8000

# Expected output:
# Uvicorn running on http://127.0.0.1:8000
# Press CTRL+C to quit
```

---

#### Step 2: Set Up Frontend

**In a NEW terminal window:**

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.local.example .env.local

# Your .env.local should contain:
# NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Start Frontend:**
```bash
# Run development server
npm run dev

# Expected output:
# Ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

---

## Running the Application

### Prerequisites for Running
1. ✅ Groq API key obtained
2. ✅ Backend `.env` file configured
3. ✅ PDF files placed in project root
4. ✅ Dependencies installed

### Launch Procedure

#### Terminal 1: Backend
```bash
cd backend
source venv/bin/activate  # macOS/Linux: or venv\Scripts\activate on Windows
python -m uvicorn main:app --reload --port 8000
```

#### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## Verification & Testing

### Step 1: Verify Backend is Running

```bash
# In a new terminal, test the health endpoint
curl http://localhost:8000/health

# Expected response:
# {"status": "healthy", "timestamp": "2024-01-15T10:30:00"}
```

### Step 2: Verify Frontend is Running

- Open browser: http://localhost:3000
- Should see the landing page with "PrepMe.AI" logo
- Should NOT see any errors in browser console

### Step 3: Test Subject Selection

1. Click "Get Started Free" or "Login"
2. Sign up with test email: `test@example.com`, password: `Test123!`
3. After login, use the subject tabs at top:
   - **SCIENCE** (Blue) - Test with Science topics
   - **MATHS** (Blue) - Test with Mathematics topics
   - **SOCIAL STUDIES** (Orange) - Test with Social Science topics
   - **ENGLISH** (Purple) - Test with English topics

### Step 4: Test AI Tutor

1. Go to **AI Tutor**
2. Select a topic from dropdown
3. Ask a question like: "What is photosynthesis?"
4. Should get an AI response with citations

### Step 5: Test Quiz Generation

1. Go to **Quiz**
2. Select a topic
3. Click "Generate Question"
4. Should generate a multiple-choice question
5. Answer and get feedback

### Step 6: Test Planner

1. Go to **Planner**
2. Should see a personalized study schedule
3. Topics should match selected subject
4. Can mark sessions as complete

### Step 7: Test Analytics

1. Go to **Analytics**
2. Should show readiness score
3. Should show topic-wise performance
4. Should match selected subject topics

### Step 8: Test Mock Exam

1. Go to **Mock Exam**
2. Select subject from dropdown
3. Click "Generate Exam"
4. Should generate a full mock paper with questions

---

## PDF Files Setup

### Required PDFs

Place these files in the project root directory (where you cloned):

```
prepmeai/
├── ncert_science_8.pdf
├── ncert_maths_8.pdf
├── ncert_social_8.pdf
├── ncert_english_8.pdf
├── backend/
├── frontend/
└── ...
```

### PDF Download Resources

- **Science**: NCERT Class 8 Science textbook PDF
- **Maths**: NCERT Class 8 Mathematics textbook PDF
- **Social Studies**: NCERT Class 8 Social Studies textbook PDF
- **English**: NCERT Class 8 English (Honeydew) textbook PDF

**Note:** PDFs must be in this exact format for RAG (Retrieval Augmented Generation) to work.

---

## Troubleshooting

### Frontend Issues

#### Issue: "Cannot GET /"
**Solution:** Frontend is not running on port 3000
```bash
cd frontend
npm run dev
```

#### Issue: API calls failing / CORS errors
**Solution:** Backend is not running or on wrong port
```bash
# Make sure backend is running on 8000
cd backend
source venv/bin/activate
python -m uvicorn main:app --reload --port 8000
```

#### Issue: "Module not found" errors
**Solution:** Dependencies not installed
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

### Backend Issues

#### Issue: "ModuleNotFoundError: No module named 'fastapi'"
**Solution:** Virtual environment not activated or dependencies not installed
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

#### Issue: "GROQ_API_KEY not found"
**Solution:** .env file not configured
```bash
cd backend
cp .env.example .env
# Edit .env and add your actual Groq API key
```

#### Issue: "PDF not found"
**Solution:** PDFs not in correct location
```bash
# Make sure PDFs are in project root:
ls ncert_*.pdf
# Should show:
# ncert_science_8.pdf
# ncert_maths_8.pdf
# ncert_social_8.pdf
# ncert_english_8.pdf
```

#### Issue: "Address already in use" (port 8000 or 3000)
**Solution:** Another process is using the port
```bash
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -i :8000
kill -9 <PID>
```

---

### Database Issues

#### Issue: Database lock or corruption
**Solution:** Delete and recreate database
```bash
cd backend
rm prepmeai.db
python -m uvicorn main:app --reload
```

---

## Project Structure

```
prepmeai/
│
├── 📁 frontend/                          # Next.js React App
│   ├── 📁 app/
│   │   ├── page.tsx                     # Landing page
│   │   ├── layout.tsx                   # Root layout
│   │   ├── 📁 login/
│   │   ├── 📁 home/                     # Dashboard
│   │   ├── 📁 quiz/                     # Quiz Interface
│   │   ├── 📁 tutor/                    # AI Tutor Chat
│   │   ├── 📁 planner/                  # Study Planner
│   │   ├── 📁 analytics/                # Analytics Dashboard
│   │   ├── 📁 exam/                     # Mock Exam
│   │   └── 📁 profile/                  # User Profile
│   ├── 📁 components/
│   │   ├── 📁 layout/
│   │   │   ├── app-shell.tsx           # Main layout wrapper
│   │   │   ├── sidebar.tsx             # Left navigation
│   │   │   ├── topnav.tsx              # Top navigation bar
│   │   │   └── subject-switcher.tsx    # Subject tabs
│   │   ├── 📁 ui/                       # shadcn/ui components
│   │   ├── SubjectBackground.tsx        # Theme icons
│   │   └── ...
│   ├── 📁 lib/
│   │   ├── auth.tsx                    # Auth context & hooks
│   │   ├── subjects.ts                 # Subject configuration
│   │   ├── utils.ts                    # Utilities
│   │   └── ...
│   ├── 📁 context/
│   │   └── ThemeContext.tsx            # Theme/subject context
│   ├── .env.local                       # Environment variables
│   ├── tailwind.config.ts              # Tailwind configuration
│   ├── package.json
│   └── ...
│
├── 📁 backend/                          # FastAPI Python App
│   ├── 📁 routers/
│   │   ├── __init__.py
│   │   ├── auth.py                     # Authentication endpoints
│   │   ├── quiz.py                     # Quiz generation & grading
│   │   ├── tutor.py                    # AI Tutor endpoint
│   │   ├── planner.py                  # Study plan endpoints
│   │   ├── analytics.py                # Analytics endpoints
│   │   ├── exam.py                     # Mock exam endpoints
│   │   ├── profile.py                  # User profile endpoints
│   │   └── ...
│   ├── 📁 services/
│   │   ├── rag_service.py              # RAG retrieval & LLM calls
│   │   ├── question_enhancer.py        # Question generation logic
│   │   ├── exam_service.py             # Exam paper generation
│   │   └── ...
│   ├── 📁 db/
│   │   ├── database.py                 # Database connection
│   │   ├── models.py                   # SQLAlchemy models
│   │   ├── crud.py                     # Database operations
│   │   └── ...
│   ├── 📁 models/
│   │   └── pydantic_models.py          # Request/response schemas
│   ├── main.py                          # FastAPI app entry point
│   ├── config.py                        # Configuration
│   ├── .env                             # Environment variables
│   ├── requirements.txt                 # Python dependencies
│   ├── prepmeai.db                      # SQLite database
│   └── venv/                            # Python virtual environment
│
├── 📁 core/                             # Core utilities (if present)
├── 📁 assets/                           # Images & static files
│
├── 📄 ncert_science_8.pdf               # Study material
├── 📄 ncert_maths_8.pdf
├── 📄 ncert_social_8.pdf
├── 📄 ncert_english_8.pdf
│
├── 📄 README.md                         # Project overview
├── 📄 SETUP.md                          # Quick setup guide
├── 📄 IMPLEMENTATION_GUIDE.md           # This file
├── 📄 SUBJECT_FIX.md                    # Subject switcher fix notes
├── 📄 SUBJECT_EXTENSION_COMPLETE.md     # Subject extension details
├── .env.example                         # Environment template
├── .gitignore                           # Git ignore rules
├── start-dev.bat                        # Windows startup script
├── start-dev.sh                         # Unix startup script
└── ...
```

---

## Key Features Implemented

### ✅ Multi-Subject Support (4 Subjects)
- **Science** - 11 chapters
- **Mathematics** - 14 chapters
- **Social Studies** - 7 chapters
- **English** - 15 chapters

### ✅ AI Tutor
- RAG-based retrieval from NCERT textbooks
- Mastery-aware explanations
- Citation tracking
- Follow-up suggestions

### ✅ Adaptive Quiz Generation
- Difficulty scaling (Easy/Medium/Hard)
- Multiple question types (MCQ, True/False, Fill-blank, Short answer)
- Misconception detection
- Mistake journal tracking

### ✅ Study Planner
- Personalized study schedules
- Topic prioritization based on mastery
- Session micro-goals
- Burnout detection

### ✅ Analytics Dashboard
- Readiness score computation
- Topic-wise performance
- Exam prediction
- Priority queue generation

### ✅ Mock Exams
- CBSE-format papers
- Auto-grading for objective questions
- Section-wise scoring
- Detailed analysis

---

## Next Steps

After successful setup:

1. **Explore the App** - Navigate through all dashboards
2. **Generate Content** - Create quizzes and study plans
3. **Take Tests** - Use mock exams to assess readiness
4. **Monitor Progress** - Track analytics and mastery
5. **Customize** - Adjust study hours and exam dates in profile

---

## Support & Resources

### Documentation
- **API Docs**: http://localhost:8000/docs (Swagger UI)
- **ReDoc**: http://localhost:8000/redoc
- **GitHub**: Check the repository for issues/discussions

### External Resources
- [Groq API Docs](https://console.groq.com/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [NCERT Textbooks](https://ncert.nic.in)

---

## License & Credits

PrepMeAI is built with:
- **FastAPI** - Modern Python web framework
- **Next.js** - React framework
- **Groq** - Fast LLM inference
- **SQLAlchemy** - ORM
- **Tailwind CSS** - Utility-first CSS

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Status**: Production Ready ✅
