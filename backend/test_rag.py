"""
Quick test script to verify RAG is working
Run: python test_rag.py
"""
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.rag_service import retrieve, rag_answer, assess_answer, generate_question
from config import get_settings

settings = get_settings()

def test_retrieval():
    """Test PDF retrieval"""
    print("\n" + "="*60)
    print("TEST 1: PDF Retrieval")
    print("="*60)
    
    pdf_path = os.path.join(os.path.dirname(__file__), "..", settings.pdf_path)
    
    if not os.path.exists(pdf_path):
        print(f"❌ PDF not found at: {pdf_path}")
        return False
    
    print(f"✅ PDF found at: {pdf_path}")
    
    query = "What are stars?"
    print(f"\nQuery: {query}")
    
    chunks = retrieve(query, pdf_path, top_k=3)
    
    if not chunks:
        print("❌ No chunks retrieved")
        return False
    
    print(f"✅ Retrieved {len(chunks)} chunks")
    for i, chunk in enumerate(chunks, 1):
        print(f"\nChunk {i} (Pages {chunk['pages']}):")
        print(chunk['text'][:200] + "...")
    
    return True


def test_rag_answer():
    """Test RAG answer generation"""
    print("\n" + "="*60)
    print("TEST 2: RAG Answer Generation")
    print("="*60)
    
    pdf_path = os.path.join(os.path.dirname(__file__), "..", settings.pdf_path)
    
    if not settings.groq_api_key:
        print("❌ GROQ_API_KEY not set in .env")
        return False
    
    print("✅ Groq API key found")
    
    question = "What causes seasons on Earth?"
    print(f"\nQuestion: {question}")
    
    try:
        result = rag_answer(question, pdf_path, mastery_score=0.5)
        
        print(f"\n✅ Answer generated:")
        print(result['answer'])
        
        print(f"\n✅ Sources ({result['retrieved_chunks']} chunks):")
        for source in result['sources']:
            print(f"  - Pages {source['pages']}")
        
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_assessment():
    """Test answer assessment"""
    print("\n" + "="*60)
    print("TEST 3: Answer Assessment")
    print("="*60)
    
    pdf_path = os.path.join(os.path.dirname(__file__), "..", settings.pdf_path)
    
    question = "What are constellations?"
    student_answer = "Constellations are groups of stars that form patterns in the sky."
    
    print(f"Question: {question}")
    print(f"Student Answer: {student_answer}")
    
    try:
        assessment = assess_answer(question, student_answer, pdf_path, difficulty_level=0.3)
        
        print(f"\n✅ Assessment completed:")
        print(f"  Score: {assessment['score']}/{assessment['max_score']}")
        print(f"  Correctness: {assessment['correctness']}")
        print(f"  Remarks: {assessment['remarks']}")
        print(f"  Points Covered: {assessment['key_points_covered']}")
        print(f"  Points Missed: {assessment['key_points_missed']}")
        
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_question_generation():
    """Test question generation"""
    print("\n" + "="*60)
    print("TEST 4: Question Generation")
    print("="*60)
    
    pdf_path = os.path.join(os.path.dirname(__file__), "..", settings.pdf_path)
    
    topic = "Moon phases"
    difficulty = 0.5
    
    print(f"Topic: {topic}")
    print(f"Difficulty: {difficulty}")
    
    try:
        question_data = generate_question(topic, difficulty, pdf_path)
        
        if "error" in question_data:
            print(f"❌ Error: {question_data['error']}")
            return False
        
        print(f"\n✅ Question generated:")
        print(f"  Question: {question_data['question']}")
        print(f"  Difficulty: {question_data['difficulty']}")
        print(f"  Expected Length: {question_data['expected_answer_length']}")
        print(f"  Key Concepts: {question_data['key_concepts']}")
        
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


if __name__ == "__main__":
    print("\n" + "="*60)
    print("PrepMeAI RAG System Test")
    print("="*60)
    
    results = []
    
    # Run tests
    results.append(("PDF Retrieval", test_retrieval()))
    results.append(("RAG Answer", test_rag_answer()))
    results.append(("Assessment", test_assessment()))
    results.append(("Question Generation", test_question_generation()))
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name}: {status}")
    
    total_passed = sum(1 for _, passed in results if passed)
    print(f"\nTotal: {total_passed}/{len(results)} tests passed")
    
    if total_passed == len(results):
        print("\n🎉 All tests passed! RAG system is working correctly.")
    else:
        print("\n⚠️  Some tests failed. Check the errors above.")
