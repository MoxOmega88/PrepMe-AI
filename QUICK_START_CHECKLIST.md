# PrepMeAI - Quick Start Checklist ✅

## 🚀 5-Minute Setup Checklist

Use this checklist to verify you've completed all setup steps.

### Pre-Setup Requirements
- [ ] Python 3.10+ installed
- [ ] Node.js 18+ installed  
- [ ] Git installed
- [ ] ~2GB free disk space

### Step 1: Clone & Navigate (1 min)
```bash
git clone https://github.com/your-username/prepmeai.git
cd prepmeai
```
- [ ] Repository cloned
- [ ] Inside `prepmeai` directory

### Step 2: Get Groq API Key (2 min)
1. Go to https://console.groq.com/keys
2. Sign up (if needed)
3. Click "Create API Key"
4. Copy your key (looks like: `gsk_xxxxxxxxxxxxx`)

- [ ] Groq API key obtained
- [ ] Key saved securely (do NOT share)

### Step 3: Configure Environment (1 min)

**Backend:**
```bash
cd backend
cp .env.example .env
# Edit .env and paste your Groq API key on the GROQ_API_KEY line
```
- [ ] `backend/.env` created
- [ ] `GROQ_API_KEY` filled in with your actual key

### Step 4: Place PDF Files (Optional but Recommended)
Download NCERT Class 8 PDFs and place in project root:
```
prepmeai/
├── ncert_science_8.pdf
├── ncert_maths_8.pdf
├── ncert_social_8.pdf
├── ncert_english_8.pdf
```
- [ ] All 4 PDFs placed in project root (or at least science)

### Step 5: Run Startup Script (1 min)

**Windows:**
```bash
start-dev.bat
```

**macOS/Linux:**
```bash
chmod +x start-dev.sh
./start-dev.sh
```

- [ ] Startup script completed successfully
- [ ] Backend running on http://localhost:8000
- [ ] Frontend running on http://localhost:3000

### Step 6: Verify Setup (1 min)

1. Open http://localhost:3000 in browser
2. Should see PrepMe.AI landing page
3. Click "Get Started Free"
4. Sign up with test account
5. Should see dashboard with subject tabs

- [ ] Frontend loads without errors
- [ ] Can sign up/login
- [ ] Can see all 4 subject tabs (Science, Maths, Social Studies, English)
- [ ] No console errors in browser

---

## ✅ Verification Tests

### Test 1: Backend API Health
```bash
curl http://localhost:8000/health
```
**Expected:** `{"status": "healthy", "timestamp": "..."}`

- [ ] Endpoint responds with healthy status

### Test 2: Subject Selection
1. Login to http://localhost:3000
2. Click on each subject tab:
   - **SCIENCE** - Should see science topics
   - **MATHS** - Should see math topics
   - **SOCIAL STUDIES** - Should see social topics
   - **ENGLISH** - Should see English chapters

- [ ] Science tab shows correct topics
- [ ] Maths tab shows correct topics
- [ ] Social Studies tab shows correct topics
- [ ] English tab shows correct topics

### Test 3: AI Tutor
1. Go to **AI Tutor** page
2. Select a topic from dropdown
3. Ask a question (e.g., "What is photosynthesis?")
4. Should get an AI response

- [ ] Topic dropdown loads
- [ ] Can submit question
- [ ] Receives AI response with explanation

### Test 4: Quiz Generation
1. Go to **Quiz** page
2. Select a topic
3. Click "Generate Question"
4. Should generate a quiz question

- [ ] Topic selection works
- [ ] Question generates
- [ ] Can answer question
- [ ] Receives feedback

### Test 5: Study Planner
1. Go to **Planner** page
2. Should see study schedule

- [ ] Planner loads without errors
- [ ] Shows calendar/schedule
- [ ] Topics match selected subject

### Test 6: Mock Exam
1. Go to **Exam** page
2. Select subject from dropdown
3. Click "Generate Exam"
4. Should create exam paper

- [ ] Subject dropdown includes all 4 subjects
- [ ] Exam generates
- [ ] Can answer questions

---

## 🔧 Common Quick Fixes

### Frontend not loading?
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Backend crashes?
```bash
cd backend
source venv/bin/activate  # macOS/Linux
# or venv\Scripts\activate  # Windows
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### Wrong topics showing?
Make sure you selected the correct subject using the tabs at the top.

### PDF errors?
Make sure PDFs are in project root and named exactly:
- `ncert_science_8.pdf`
- `ncert_maths_8.pdf`
- `ncert_social_8.pdf`
- `ncert_english_8.pdf`

### API Key error?
1. Check you copied the FULL key (starts with `gsk_`)
2. Paste into `backend/.env` on the GROQ_API_KEY line
3. Restart backend with `python -m uvicorn main:app --reload --port 8000`

---

## 📞 Still Having Issues?

1. **Check the Terminal Output** - Most errors are explained in the terminal
2. **Read IMPLEMENTATION_GUIDE.md** - Detailed troubleshooting section
3. **Check GitHub Issues** - Someone might have had the same issue
4. **API Docs** - Visit http://localhost:8000/docs to test endpoints directly

---

## ✨ You're Done!

Congratulations! You have PrepMeAI running. Now:

1. 🎓 **Explore the Features** - Try all the dashboards
2. 📱 **Test Different Subjects** - Switch between Science, Maths, Social Studies, English
3. 🧠 **Generate Content** - Create quizzes and study plans
4. 📊 **Check Analytics** - Monitor your progress
5. 🚀 **Customize** - Update profile with exam date and daily study hours

---

**Happy Learning! 🚀**

For detailed setup, see: [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)
For quick reference, see: [SETUP.md](SETUP.md)
