import os
import re
import gc
import torch
import json
import uuid
import unicodedata
import fitz  # PyMuPDF
from datetime import datetime, timezone
from PIL import Image
from transformers import Qwen2VLForConditionalGeneration, AutoProcessor
from qwen_vl_utils import process_vision_info
from sentence_transformers import SentenceTransformer, util
from google.colab import files

# --- CONFIGURATION ---
os.environ["PYTORCH_ALLOC_CONF"] = "expandable_segments:True"
MODEL_ID = "Qwen/Qwen2-VL-2B-Instruct"
SBERT_MODEL_ID = "all-mpnet-base-v2"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

SEMANTIC_WEIGHT = 0.75
KEYWORD_WEIGHT = 0.25
KEYWORD_THRESHOLD = 0.45
IRRELEVANCE_THRESHOLD = 0.20

def clear_memory():
    """Aggressive cleanup."""
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.ipc_collect()

# --- LOAD MODELS ---
print(f"📦 Loading OCR Model: {MODEL_ID}...")
ocr_model = Qwen2VLForConditionalGeneration.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.float16, 
    device_map="auto",
    trust_remote_code=True
)
ocr_processor = AutoProcessor.from_pretrained(MODEL_ID, trust_remote_code=True)

print(f"📦 Loading Grading Model: {SBERT_MODEL_ID}...")
sbert_model = SentenceTransformer(SBERT_MODEL_ID, device=DEVICE)
print("✅ Models Ready!")

# --- UTILS ---
def normalise_text(text):
    if not text: return ""
    text = unicodedata.normalize("NFC", text)
    text = re.sub(r"[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]", " ", text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\s([.,;:!?])", r"\1", text)
    text = re.sub(r"([.,;:!?])([^\s\d])", r"\1 \2", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

def get_word_variations(word):
    w = word.lower().strip()
    vars = {w}
    if w.endswith('ies') and len(w) > 3: vars.add(w[:-3] + 'y')
    if w.endswith('es') and len(w) > 2: vars.add(w[:-2]); vars.add(w[:-1])
    if w.endswith('s') and len(w) > 1: vars.add(w[:-1])
    if w.endswith('y'): vars.add(w[:-1] + 'ies')
    elif w.endswith(('s', 'x', 'z', 'ch', 'sh')): vars.add(w + 'es')
    else: vars.add(w + 's')
    return vars

# --- OCR ENGINE ---
def run_ocr(image):
    """Transcribes a single image precisely."""
    clear_memory()
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image", "image": image, "max_pixels": 768 * 28 * 28},
                {"type": "text", "text": "Transcribe all text from this image precisely. Read line by line. Output ONLY the raw transcribed text."}
            ]
        }
    ]
    text_prompt = ocr_processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    image_inputs, _ = process_vision_info(messages)
    inputs = ocr_processor(text=[text_prompt], images=image_inputs, padding=True, return_tensors="pt").to(DEVICE)
    with torch.no_grad():
        generated_ids = ocr_model.generate(**inputs, max_new_tokens=1536, do_sample=False)
    output_text = ocr_processor.batch_decode([generated_ids[0][len(inputs.input_ids[0]):]], skip_special_tokens=True)[0]
    output_text = re.sub(r'\(?\d{1,4},\s*\d{1,4}\)?', '', output_text)
    output_text = re.sub(r'<\|.*?\|>', '', output_text)
    del inputs, generated_ids; clear_memory()
    return output_text.strip()

# --- GRADING ENGINE ---
def grade_answer(stu_text, q_data):
    stu_clean = normalise_text(stu_text)
    ref_clean = normalise_text(q_data['expected_answer'])
    keywords = q_data.get('keywords', [])
    max_marks = q_data['max_marks']

    if not stu_clean:
        return {
            "question_id": q_data.get("question_id", str(uuid.uuid4())),
            "question_no": q_data['question_no'],
            "extracted_answer": "",
            "matched_keywords": [],
            "missing_keywords": keywords,
            "ai_marks": 0.0, "final_marks": 0.0, "max_marks": max_marks,
            "confidence": 0.0, "teacher_comment": "No text found."
        }

    # 1. Semantic Score
    stu_emb = sbert_model.encode(stu_clean, convert_to_tensor=True)
    ref_emb = sbert_model.encode(ref_clean, convert_to_tensor=True)
    sem_score = float(util.cos_sim(stu_emb, ref_emb)[0])
    
    # 2. Safety Net
    is_irrelevant = sem_score < IRRELEVANCE_THRESHOLD
    
    kw_score = 0.0
    matched_kws = []
    
    if is_irrelevant:
        kw_rationale = "⚠️ Severely irrelevant answer. Keyword marks nullified."
    elif keywords:
        found_count = 0
        for kw in keywords:
            kw_low = kw.lower().strip()
            found = False
            for var in get_word_variations(kw_low):
                if re.search(rf'\b{re.escape(var)}\b', stu_clean.lower()):
                    found = True; break
            if not found:
                kw_emb = sbert_model.encode(kw_low, convert_to_tensor=True)
                # Compare against sentences for semantic keyword matching
                sentences = [s.strip() for s in re.split(r'[.\n!?;]', stu_clean.lower()) if s.strip()]
                if sentences:
                    sent_embs = sbert_model.encode(sentences, convert_to_tensor=True)
                    max_sim = float(util.cos_sim(kw_emb, sent_embs)[0].max())
                    if max_sim >= KEYWORD_THRESHOLD: found = True
            
            if found:
                found_count += 1
                matched_kws.append(kw)
        kw_score = found_count / len(keywords)
    else:
        kw_score = sem_score

    # 3. Final Marks (75/25)
    final_score = (sem_score * SEMANTIC_WEIGHT) + (kw_score * KEYWORD_WEIGHT)
    ai_marks = min(round(final_score * max_marks * 2) / 2, max_marks)

    return {
        "question_id": q_data.get("question_id", str(uuid.uuid4())),
        "question_no": q_data['question_no'],
        "extracted_answer": stu_clean,
        "matched_keywords": matched_kws,
        "missing_keywords": [k for k in keywords if k not in matched_kws],
        "ai_marks": ai_marks,
        "final_marks": ai_marks,
        "max_marks": max_marks,
        "confidence": round(sem_score, 2),
        "teacher_comment": "",
        "semantic_rationale": f"Similarity: {sem_score:.2%}",
        "keyword_rationale": f"Found {len(matched_kws)}/{len(keywords)} keywords."
    }

# --- SEGMENTATION ENGINE (Perfected) ---
def segment_answers(text):
    """
    Splits the aggregated text into logical segments based on answer markers.
    Handles noisy markers like 'AnsW1', 'Anst:', 'Ans 25', and fused text like 'CO2. Ans'.
    """
    # This pattern catches "Ans", "Answer", "Q", "Question" followed by optional noise and numbers.
    # It also looks for these markers after a period or newline to handle fused text.
    marker_pattern = re.compile(r'(?i)(?:\b|\.|\n)\s*(?:ans|answer|q|question)[a-z]*\W*\d*[:\s-]*')
    
    matches = list(marker_pattern.finditer(text))
    
    if not matches:
        return {1: text.strip()}

    segments = {}
    q_no = 1
    
    for i in range(len(matches)):
        start = matches[i].end()
        end = matches[i+1].start() if i+1 < len(matches) else len(text)
        
        # Capture the content between markers
        content = text[start:end].strip()
        
        # Basic cleanup of leftovers like "Answer>" or lingering punctuation
        content = re.sub(r'^[>\W]+', '', content).strip()
        
        # Only add if it's not empty (handles consecutive noise markers)
        if content:
            segments[q_no] = content
            q_no += 1
        elif i == len(matches) - 1:
            # If the last marker is empty (e.g., student wrote "Ans 3:" but left it blank)
            segments[q_no] = ""
            q_no += 1
            
    return segments

# --- MAIN EXECUTION ---
def run_evaluation(rubric):
    print("\n⬆️ Upload PDF:")
    uploaded = files.upload()
    if not uploaded: return
    
    filename = list(uploaded.keys())[-1]
    doc = fitz.open(filename)
    full_text = ""
    for i in range(len(doc)):
        print(f"  ➜ OCR Page {i+1}/{len(doc)}...", end="")
        pix = doc.load_page(i).get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        full_text += " " + run_ocr(img)
        print(" Done.")

    # 1. Segment using the verified logic
    print("\n" + "="*30 + " [DEBUG] RAW OCR OUTPUT " + "="*30)
    print(full_text.strip())
    print("="*80)

    segments = segment_answers(full_text)
    
    print("\n" + "="*30 + " [DEBUG] LOGICAL SEGMENTS " + "="*30)
    print(json.dumps(segments, indent=2))
    print("="*80)

    # 2. Grade each question against rubric
    results = []
    total_ai = 0
    for q in rubric:
        q_no = q['question_no']
        stu_ans = segments.get(q_no, "")
        res = grade_answer(stu_ans, q)
        results.append(res)
        total_ai += res["ai_marks"]

    # 3. Final Production JSON
    final_response = {
        "grading_id": str(uuid.uuid4()),
        "submission_id": str(uuid.uuid4()),
        "exam_id": "exam_001",
        "student_name": "Ansh Badal",
        "question_results": results,
        "total_ai_marks": round(total_ai, 2),
        "status": "graded",
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "metadata": {"aggregated_text": full_text.strip()}
    }
    
    print("\n" + "="*60 + "\n✅ EVALUATION COMPLETE\n" + "="*60)
    print(json.dumps(final_response, indent=2))
    with open("grading_result.json", "w") as f: json.dump(final_response, f, indent=2)

if __name__ == "__main__":
    user_rubric = [
        {
            "question_id": "q_1",
            "question_no": 1,
            "question_text": "What is Photosynthesis? Explain its importance.",
            "expected_answer": "Photosynthesis is the process by which plants make their own food using sunlight. Plants take in carbon dioxide and release oxygen during this process. It provides energy and is essential for life.",
            "keywords": ["photosynthesis", "plants", "sunlight", "food", "energy", "carbon dioxide", "oxygen", "process"],
            "max_marks": 50
        },
        {
            "question_id": "q_2",
            "question_no": 2,
            "question_text": "What is Machine Learning?",
            "expected_answer": "Machine Learning is a subset of Artificial Intelligence that enables systems to learn from data using algorithms and improve performance over time through training and experience.",
            "keywords": ["machine learning", "artificial intelligence", "subset", "data", "algorithms", "training", "experience", "accuracy"],
            "max_marks": 50
        }
    ]
    run_evaluation(user_rubric)