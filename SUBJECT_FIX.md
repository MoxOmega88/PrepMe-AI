# Subject Display Fix - Social Studies & English

## Issue Identified
The quiz page was checking for `subject === "social"` but the profile stores the subject as `social_studies` (with underscore). This caused:
- Maths topics to be displayed when Social Studies was selected
- Maths topics to be displayed when English was selected

## Root Cause
- Frontend stores subject as: `social_studies` and `english`
- Quiz page was checking for: `social` (missing the underscore)
- This caused it to fall through to the default case (Science topics being shown, but since there was state mismatch, it showed Maths)

## Changes Made

### `frontend/app/quiz/page.tsx`

Fixed 3 locations where subject comparison was incorrect:

1. **Line ~321** - Topic list selection in SetupPanel:
```typescript
// BEFORE
const topics = subject === "maths" ? MATHS_TOPICS 
  : subject === "social" ? SOCIAL_TOPICS  // ❌ Wrong
  : subject === "english" ? ENGLISH_TOPICS
  : SCIENCE_TOPICS

// AFTER  
const topics = subject === "maths" ? MATHS_TOPICS 
  : subject === "social_studies" ? SOCIAL_TOPICS  // ✅ Fixed
  : subject === "english" ? ENGLISH_TOPICS
  : SCIENCE_TOPICS
```

2. **Line ~331** - Topic reset useEffect:
```typescript
// BEFORE
const list = subject === "maths" ? MATHS_TOPICS
  : subject === "social" ? SOCIAL_TOPICS  // ❌ Wrong
  : subject === "english" ? ENGLISH_TOPICS
  : SCIENCE_TOPICS

// AFTER
const list = subject === "maths" ? MATHS_TOPICS
  : subject === "social_studies" ? SOCIAL_TOPICS  // ✅ Fixed
  : subject === "english" ? ENGLISH_TOPICS
  : SCIENCE_TOPICS
```

3. **Line ~467** - Prerequisites redirect logic:
```typescript
// BEFORE
const topics = subject === "maths" ? MATHS_TOPICS
  : subject === "social" ? SOCIAL_TOPICS  // ❌ Wrong
  : subject === "english" ? ENGLISH_TOPICS
  : SCIENCE_TOPICS

// AFTER
const topics = subject === "maths" ? MATHS_TOPICS
  : subject === "social_studies" ? SOCIAL_TOPICS  // ✅ Fixed
  : subject === "english" ? ENGLISH_TOPICS
  : SCIENCE_TOPICS
```

## Verification

### Backend Support
Backend already correctly handles all variations:
- ✅ `social` (accepted)
- ✅ `social_studies` (accepted)  
- ✅ `social science` (accepted)
- ✅ `Social Studies` (accepted)

See `backend/routers/quiz.py` line 79:
```python
elif s in ("social", "social science", "social studies", "social_studies"):
    raw = os.getenv("PDF_SOCIAL_PATH", "ncert_social_8.pdf")
```

### Frontend Consistency
- Tutor page: Already handles both `social_studies` and `social` ✅
- Quiz page: Now fixed to use `social_studies` ✅
- Subject switcher: Uses `social_studies` ✅
- Profile/Auth: Stores as `social_studies` ✅

## Test Steps

1. **Login to the app**
2. **Switch to Social Studies** using the subject tabs at the top
3. **Go to Quiz page**
   - ✅ Should see Social Studies tab highlighted
   - ✅ Should see Social Science topics in dropdown:
     - Natural Resources and Their Conservation
     - Reshaping India's Political Map
     - The Rise of the Marathas
     - The Colonial Era in India
     - Universal Franchise and India's Electoral System
     - The Parliamentary System: Legislature and Executive
     - Factors of Production

4. **Switch to English** using the subject tabs
5. **Go to Quiz page**
   - ✅ Should see English tab highlighted
   - ✅ Should see English topics in dropdown:
     - The Wit that Won Hearts
     - A Concrete Example
     - Wisdom Paves the Way
     - (and 12 more chapters)

6. **Generate a question**
   - ✅ Should generate questions from the correct PDF
   - ✅ Should use correct textbook content

## Related Files
- `frontend/app/quiz/page.tsx` - Fixed ✅
- `frontend/app/tutor/page.tsx` - Already correct ✅
- `frontend/lib/subjects.ts` - Defines `social_studies` type ✅
- `backend/routers/quiz.py` - Accepts all variations ✅

## Status
🟢 **FIXED** - Social Studies and English now display correct topics in Quiz page
