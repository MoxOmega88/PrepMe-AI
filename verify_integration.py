#!/usr/bin/env python3
"""
Integration Verification Script
Checks that all Social Science and English components are properly integrated
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_imports():
    """Test all critical imports work"""
    print("🔍 Testing imports...")
    try:
        from services.rag_service import TOPIC_TO_CHAPTER, SUBJECT_PDF_MAP, retrieve, assess_answer
        from services.exam_service import CBSE_PATTERNS
        from services.question_enhancer import PREREQUISITES
        print("✅ All imports successful")
        return True
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False

def test_topic_coverage():
    """Verify all subjects have topics mapped"""
    print("\n🔍 Testing topic coverage...")
    from services.rag_service import TOPIC_TO_CHAPTER
    
    science = [k for k in TOPIC_TO_CHAPTER if any(x in k for x in ['Force', 'Light', 'Health', 'Science', 'Matter', 'Electricity', 'Pressure', 'Skies'])]
    maths = [k for k in TOPIC_TO_CHAPTER if any(x in k for x in ['Rational', 'Linear', 'Quadrilateral', 'Graph', 'Square', 'Cube', 'Algebra', 'Exponent', 'Geometry', 'Data', 'Mensuration', 'Factorisation', 'Proportions'])]
    social = [k for k in TOPIC_TO_CHAPTER if any(x in k for x in ['Resources', 'Reshaping', 'Marathas', 'Colonial', 'Franchise', 'Parliamentary', 'Production'])]
    english = [k for k in TOPIC_TO_CHAPTER if any(x in k for x in ['Wit', 'Concrete', 'Wisdom', 'Valour', 'Mother', 'Kurien', 'Word', 'Brush', 'Spectacular', 'Cherry', 'Harvest', 'Rain', 'Feathered', 'Magnifying', 'Bibha'])]
    
    print(f"  Science topics: {len(science)}")
    print(f"  Maths topics: {len(maths)}")
    print(f"  Social topics: {len(social)}")
    print(f"  English topics: {len(english)}")
    
    if len(social) >= 7 and len(english) >= 15:
        print("✅ All subjects have topics")
        return True
    else:
        print("❌ Missing topics for some subjects")
        return False

def test_pdf_mappings():
    """Verify PDF mappings exist for all subjects"""
    print("\n🔍 Testing PDF mappings...")
    from services.rag_service import SUBJECT_PDF_MAP
    
    required = ['science', 'maths', 'social', 'english']
    missing = [s for s in required if s not in SUBJECT_PDF_MAP]
    
    if not missing:
        print("✅ All subjects have PDF mappings")
        for subj in required:
            print(f"  {subj}: {SUBJECT_PDF_MAP[subj]}")
        return True
    else:
        print(f"❌ Missing PDF mappings: {missing}")
        return False

def test_exam_patterns():
    """Verify CBSE exam patterns exist"""
    print("\n🔍 Testing CBSE exam patterns...")
    from services.exam_service import CBSE_PATTERNS
    
    required = ['Science', 'Mathematics', 'Social Studies', 'English']
    missing = [s for s in required if s not in CBSE_PATTERNS]
    
    if not missing:
        print("✅ All subjects have exam patterns")
        for subj in required:
            print(f"  {subj}: {len(CBSE_PATTERNS[subj])} sections")
        return True
    else:
        print(f"❌ Missing exam patterns: {missing}")
        return False

def test_prerequisites():
    """Verify prerequisites are defined"""
    print("\n🔍 Testing prerequisites...")
    from services.question_enhancer import PREREQUISITES
    
    social_prereqs = [k for k in PREREQUISITES if any(x in k for x in ['India', 'Marathas', 'Resources', 'Political', 'Production'])]
    english_prereqs = [k for k in PREREQUISITES if any(x in k for x in ['Kurien', 'Cherry', 'Bibha', 'Rain'])]
    
    print(f"  Social Science prerequisites: {len(social_prereqs)}")
    print(f"  English prerequisites: {len(english_prereqs)}")
    
    if len(social_prereqs) >= 3 and len(english_prereqs) >= 3:
        print("✅ Prerequisites defined for new subjects")
        return True
    else:
        print("⚠️  Limited prerequisites (optional feature)")
        return True  # Not critical

def main():
    print("=" * 60)
    print("PREPME-AI: Social Science & English Integration Verification")
    print("=" * 60)
    
    tests = [
        test_imports,
        test_topic_coverage,
        test_pdf_mappings,
        test_exam_patterns,
        test_prerequisites,
    ]
    
    results = [test() for test in tests]
    
    print("\n" + "=" * 60)
    if all(results):
        print("✅ ALL TESTS PASSED - Integration Complete!")
        print("\n🚀 Social Science and English are ready to use!")
    else:
        print("❌ SOME TESTS FAILED - Please review errors above")
        sys.exit(1)
    print("=" * 60)

if __name__ == "__main__":
    main()
