import os
import re
import gc
import torch
import PIL.Image
from PIL import Image
from typing import Any

# This handles the "No module named 'fitz'" error
try:
    import fitz  # PyMuPDF
except ImportError:
    print("Installing missing dependencies...")
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pymupdf", "qwen-vl-utils", "accelerate"])
    import fitz

from transformers import Qwen2VLForConditionalGeneration, AutoProcessor
from qwen_vl_utils import process_vision_info
from google.colab import files

# --- CRITICAL MEMORY CONFIG ---
os.environ["PYTORCH_ALLOC_CONF"] = "expandable_segments:True"

MODEL_ID = "Qwen/Qwen2-VL-2B-Instruct"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

def clear_memory():
    """Aggressive cleanup to keep VRAM free."""
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.ipc_collect()

def normalize_text(text):
    """Collapse whitespace so OCR and reference text can be compared consistently."""
    return re.sub(r"\s+", " ", str(text or "")).strip()

def word_tokens(text):
    return normalize_text(text).split()

def char_tokens(text, include_spaces=True):
    text = normalize_text(text)
    if not include_spaces:
        text = text.replace(" ", "")
    return list(text)

def edit_counts(reference_tokens, predicted_tokens):
    """
    Count edit operations between reference text and OCR output.

    update = substituted word/character
    delete = reference word/character missing in OCR output
    insert = extra word/character produced by OCR output
    ---    = exact match
    """
    rows = len(reference_tokens) + 1
    cols = len(predicted_tokens) + 1
    dp = [[0] * cols for _ in range(rows)]

    for i in range(1, rows):
        dp[i][0] = i
    for j in range(1, cols):
        dp[0][j] = j

    for i in range(1, rows):
        for j in range(1, cols):
            if reference_tokens[i - 1] == predicted_tokens[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = min(
                    dp[i - 1][j - 1] + 1,  # update
                    dp[i - 1][j] + 1,      # delete
                    dp[i][j - 1] + 1,      # insert
                )

    counts: dict[str, Any] = {
        "update": 0,
        "delete": 0,
        "insert": 0,
        "---": 0,
        "total_errors": dp[-1][-1],
        "total_reference": len(reference_tokens),
    }

    i = len(reference_tokens)
    j = len(predicted_tokens)
    while i > 0 or j > 0:
        if (
            i > 0
            and j > 0
            and reference_tokens[i - 1] == predicted_tokens[j - 1]
            and dp[i][j] == dp[i - 1][j - 1]
        ):
            counts["---"] += 1
            i -= 1
            j -= 1
        elif i > 0 and j > 0 and dp[i][j] == dp[i - 1][j - 1] + 1:
            counts["update"] += 1
            i -= 1
            j -= 1
        elif i > 0 and dp[i][j] == dp[i - 1][j] + 1:
            counts["delete"] += 1
            i -= 1
        else:
            counts["insert"] += 1
            j -= 1

    denominator = counts["total_reference"] or 1
    counts["error_rate"] = counts["total_errors"] / denominator
    return counts

def calculate_wer_cer(reference_text, predicted_text, include_spaces_in_cer=True):
    word_error_count = edit_counts(
        word_tokens(reference_text),
        word_tokens(predicted_text)
    )
    character_error_count = edit_counts(
        char_tokens(reference_text, include_spaces=include_spaces_in_cer),
        char_tokens(predicted_text, include_spaces=include_spaces_in_cer)
    )
    return word_error_count, character_error_count

def print_error_report(reference_text, predicted_text):
    word_error_count, character_error_count = calculate_wer_cer(reference_text, predicted_text)

    print("\n=== WORD ERROR COUNT / WER ===")
    print(f"update: {word_error_count['update']}")
    print(f"delete: {word_error_count['delete']}")
    print(f"insert: {word_error_count['insert']}")
    print(f"---   : {word_error_count['---']}")
    print(f"errors: {word_error_count['total_errors']}")
    print(f"words : {word_error_count['total_reference']}")
    print(f"WER   : {word_error_count['error_rate']:.4f}")

    print("\n=== CHARACTER ERROR COUNT / CER ===")
    print(f"update: {character_error_count['update']}")
    print(f"delete: {character_error_count['delete']}")
    print(f"insert: {character_error_count['insert']}")
    print(f"---   : {character_error_count['---']}")
    print(f"errors: {character_error_count['total_errors']}")
    print(f"chars : {character_error_count['total_reference']}")
    print(f"CER   : {character_error_count['error_rate']:.4f}")

def maybe_evaluate_errors(final_output):
    choice = input("\nDo you want to upload reference text for WER/CER? (y/n): ").strip().lower()
    if choice != "y":
        return

    print("\nPlease upload the ground-truth/reference text file (.txt):")
    uploaded_reference = files.upload()
    if not uploaded_reference:
        print("No reference file uploaded. Skipping WER/CER.")
        return

    reference_filename = list(uploaded_reference.keys())[-1]
    with open(reference_filename, "r", encoding="utf-8") as ref_file:
        reference_text = ref_file.read()

    print_error_report(reference_text, final_output)

# --- LOAD MODEL ---
# float16 is the "gold standard" for stability on T4 GPUs.
print(f"📦 Loading {MODEL_ID} on {DEVICE}...")
model = Qwen2VLForConditionalGeneration.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.float16,
    device_map="auto",
    trust_remote_code=True
)
processor = AutoProcessor.from_pretrained(MODEL_ID, trust_remote_code=True)
print("✅ Model Ready!")

# --- OCR LOGIC ---
def run_ocr(image):
    """Processes a single PIL image through Qwen2-VL."""
    clear_memory()

    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "image": image,
                    "max_pixels": 768 * 28 * 28,  # Optimized for T4 VRAM
                },
                {"type": "text", "text": "Transcribe all text from this image precisely. Read line by line. Do not skip any words. Output ONLY the transcribed text."}
            ]
        }
    ]

    # Prepare inputs
    text_prompt = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    image_inputs, _ = process_vision_info(messages)
    inputs = processor(
        text=[text_prompt],
        images=image_inputs,
        padding=True,
        return_tensors="pt"
    ).to(DEVICE)

    # Generate
    with torch.no_grad():
        generated_ids = model.generate(
            **inputs,
            max_new_tokens=1536,
            do_sample=False
        )

    # Decode
    generated_ids_trimmed = [
        out_ids[len(in_ids):] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
    ]
    output_text = processor.batch_decode(
        generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False
    )[0]

    # Clean output
    output_text = re.sub(r'\(?\d{1,4},\s*\d{1,4}\)?', '', output_text).strip()
    output_text = re.sub(r'<\|.*?\|>', '', output_text).strip()

    # Cleanup
    del inputs, generated_ids, image_inputs
    clear_memory()

    return output_text

# --- PDF PROCESSING ---
def process_pdf():
    print("\n⬆️ Please upload your student answer sheet (PDF):")
    uploaded = files.upload()

    if not uploaded:
        print("❌ No file uploaded.")
        return

    filename = list(uploaded.keys())[-1]
    print(f"\n📄 Processing: {filename}")

    try:
        doc = fitz.open(filename)
        results = []

        for i in range(len(doc)):
            print(f"  ➜ Processing Page {i+1}/{len(doc)}...", end="")

            # Convert PDF page to PIL Image
            page = doc.load_page(i)
            pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

            # Run OCR
            page_text = run_ocr(img)
            results.append(page_text)
            print(" Done.")

        # Final Output Display
        final_output = "\n".join(results).strip()
        print(final_output)
        maybe_evaluate_errors(final_output)

    except Exception as e:
        print(f"\n❌ Error: {str(e)}")

if __name__ == "__main__":
    process_pdf()
