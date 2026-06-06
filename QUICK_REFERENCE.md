# PrepMeAI - Quick Reference Card

## 🚀 Start Commands

```bash
# Backend (Terminal 1)
cd backend
uvicorn main:app --reload --port 8000

# Frontend (Terminal 2)
cd frontend
npm run dev
```

**URLs**:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/docs
- Quiz: http://localhost:3000/quiz
- Tutor: http://localhost:3000/tutor

---

## 📋 Mentor Requirements Checklist

| Requirement | Status | Location |
|------------|--------|----------|
| 5 Granular Difficulty Levels | ✅ | Quiz page slider |
| Advanced Q&A (Improvised) | ✅ | Tutor page responses |
| Dynamic Assessment | ✅ | Quiz assessment results |
| Voice Input | ✅ | Mic button in Quiz/Tutor |
| Voice Output (Read Aloud) | ✅ | Volume button on responses |
| RAG Integration | ✅ | All answers from PDF |
| No Hallucination | ✅ | Source page numbers shown |
| Adaptive Difficulty | ✅ | Auto-adjusts after each quiz |

---

## 🎯 5 Difficulty Levels

| Level | Range | Label | Description | Example |
|-------|-------|-------|-------------|---------|
| 1 | 0.0-0.2 | Very Easy | Recall & Definitions | "What is a constellation?" |
| 2 | 0.2-0.4 | Easy | Basic Understanding | "Explain what constellations are" |
| 3 | 0.4-0.6 | Medium | Application | "How do constellations help navigation?" |
| 4 | 0.6-0.8 | Hard | Analysis | "Compare circumpolar and seasonal constellations" |
| 5 | 0.8-1.0 | Very Hard | Synthesis | "Evaluate the role of constellations in ancient astronomy" |

---

## 🔄 RAG Pipeline (30 seconds)

```
Student Question
    ↓
Embed Query (sentence-transformers)
    ↓
Search PDF Vectors (cosine similarity + BM25)
    ↓
Retrieve Top-5 Chunks
    ↓
Send to Groq LLM with Context
    ↓
Generate Answer (grounded in PDF)
    ↓
Return with Source Pages
```

**Key Point**: AI never sees the full PDF, only relevant chunks. This prevents hallucination.

---

## 🎤 Voice Features

**Voice Input**:
- Click mic button
- Speak your answer
- Real-time transcription
- Works in Quiz and Tutor

**Voice Output**:
- Click "Read Aloud" button
- Hears questions, answers, feedback
- Adjustable speed (0.9x default)

---

## 📊 Assessment Output

```json
{
  "score": 75,
  "correctness": "partially_correct",
  "remarks": "You correctly explained X but missed Y...",
  "key_points_covered": ["Concept A", "Example B"],
  "key_points_missed": ["Concept C"],
  "improvement_suggestions": "Try to include...",
  "model_answer": "According to NCERT page 215...",
  "difficulty_level": 0.5,
  "sources_used": 3
}
```

**Not Template-Based**: Every field is generated fresh by LLM based on student's exact answer.

---

## 🧪 Test RAG System

```bash
cd backend
python test_rag.py
```

**Expected Output**:
- ✅ PDF Retrieval: PASS
- ✅ RAG Answer: PASS
- ✅ Assessment: PASS
- ✅ Question Generation: PASS

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend won't start | Check port 8000 is free: `netstat -ano \| findstr :8000` |
| "Failed to fetch" error | Ensure backend is running, check CORS |
| PDF not found | Verify `ncert_science_8.pdf` in project root |
| Voice not working | Use Chrome/Edge, allow mic permissions |
| No Groq responses | Check `.env` has `GROQ_API_KEY` |

---

## 📁 Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `backend/services/rag_service.py` | RAG pipeline | 350 |
| `backend/routers/quiz.py` | Quiz API | 60 |
| `backend/routers/tutor.py` | Tutor API | 30 |
| `frontend/app/quiz/page.tsx` | Quiz UI | 400 |
| `frontend/app/tutor/page.tsx` | Tutor UI | 250 |

---

## 💡 Demo Script (5 min)

**Minute 1**: Show 5 difficulty levels
- Open Quiz, demonstrate slider
- Generate question at Medium difficulty

**Minute 2**: Voice input + assessment
- Click mic, speak answer
- Submit, show dynamic feedback

**Minute 3**: RAG tutor
- Ask "What causes seasons?"
- Show source page numbers
- Click "Read Aloud"

**Minute 4**: Adaptive difficulty
- Answer correctly → difficulty increases
- Answer poorly → difficulty decreases

**Minute 5**: Explain RAG
- "We search PDF first, then generate answer"
- "Vector embeddings find semantic matches"
- "No hallucination - all from NCERT"

---

## 🎓 Explain to Mentors

**What is RAG?**
"Retrieval-Augmented Generation. We retrieve relevant content from the PDF, then augment the LLM's context with it. This grounds the AI in factual content."

**Why Vector Database?**
"Traditional search finds exact keywords. Vector search understands meaning. 'What causes day/night?' matches 'Earth's rotation' even without those exact words."

**How do you prevent hallucination?**
"Three ways: (1) System prompt forbids external knowledge, (2) Only PDF chunks in context, (3) Show source page numbers for verification."

**Can this scale?**
"Yes. Current in-memory approach works for 1 PDF. For multiple textbooks, we'd use Pinecone or Weaviate vector database."

---

## ✅ Success Criteria

- [ ] Questions generated from PDF (not hardcoded)
- [ ] 5 difficulty levels visible and working
- [ ] Voice input transcribes correctly
- [ ] Assessment shows dynamic feedback
- [ ] Tutor shows source page numbers
- [ ] Read aloud works
- [ ] Adaptive difficulty adjusts
- [ ] No hallucination - answers match PDF

---

## 📞 Emergency Contacts

**If demo fails**:
1. Show `RAG_IMPLEMENTATION.md` - explains architecture
2. Show `MENTOR_DELIVERABLES.md` - proves requirements met
3. Run `python backend/test_rag.py` - verify RAG works
4. Show code in `backend/services/rag_service.py` - prove it's real

**Backup Plan**:
- Have screenshots of working demo
- Have video recording of features
- Have code walkthrough prepared

---

## 🎯 Key Talking Points

1. **"We have 5 granular difficulty levels, not just easy/hard"**
   - Show slider with descriptions
   - Explain rubric changes per level

2. **"Assessment is dynamic, not template-based"**
   - Show LLM generates fresh feedback
   - Point out specific remarks about student's answer

3. **"RAG ensures no hallucination"**
   - Explain retrieval → generation pipeline
   - Show source page numbers

4. **"Voice input and output for accessibility"**
   - Demonstrate mic button
   - Demonstrate read aloud

5. **"System adapts to student performance"**
   - Show difficulty auto-adjustment
   - Explain future: personalized learning plans

---

## 📚 Documentation

- `RAG_IMPLEMENTATION.md` - Technical deep dive
- `MENTOR_DELIVERABLES.md` - Requirements checklist
- `START_DEMO.md` - Detailed demo guide
- `QUICK_REFERENCE.md` - This file

---

## 🚀 Next Steps (Post-Demo)

1. Add database for progress tracking
2. Generate personalized study plans
3. Add more NCERT textbooks
4. Build analytics dashboard
5. Deploy to production

---

**Good luck with the demo! 🎉**
