"""
modules/ocr.py
Handwriting extraction using Qwen2-VL (Multimodal LLM).
Provides high-accuracy full-page OCR for dense handwritten text.
"""

from __future__ import annotations

import torch
import os
import re
import gc
from pathlib import Path
from PIL import Image
from transformers import Qwen2VLForConditionalGeneration, AutoProcessor
from qwen_vl_utils import process_vision_info

from app.ml.config import QWEN_MODEL_ID


class HandwritingOCR:
    """
    Wraps Qwen2-VL for high-precision full-page document understanding.
    """

    def __init__(self, model_id: str = QWEN_MODEL_ID):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"  Loading Qwen2-VL model: {model_id} on {self.device}...")
        
        # Memory optimization for production
        os.environ["PYTORCH_ALLOC_CONF"] = "expandable_segments:True"
        
        self.model = Qwen2VLForConditionalGeneration.from_pretrained(
            model_id, 
            torch_dtype=torch.float16, 
            device_map="auto",
            trust_remote_code=True,
            token=os.getenv("HF_TOKEN")
        )
        self.processor = AutoProcessor.from_pretrained(model_id, trust_remote_code=True, token=os.getenv("HF_TOKEN"))

    def extract(self, image_path: str | Path) -> str:
        """
        Extract all handwritten text from a document page.
        """
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "image": str(image_path),
                        "max_pixels": 768 * 28 * 28,
                    },
                    {
                        "type": "text", 
                        "text": "Transcribe all text from this image precisely. Read line by line. Output ONLY the raw transcribed text."
                    },
                ],
            }
        ]

        # Preparation
        text = self.processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        image_inputs, video_inputs = process_vision_info(messages)
        inputs = self.processor(
            text=[text],
            images=image_inputs,
            videos=video_inputs,
            padding=True,
            return_tensors="pt",
        ).to(self.device)

        # Inference
        with torch.no_grad():
            generated_ids = self.model.generate(
                **inputs, 
                max_new_tokens=1536,
                do_sample=False
            )
        
        generated_ids_trimmed = [
            out_ids[len(in_ids) :] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
        ]
        output_text = self.processor.batch_decode(
            generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False
        )[0]
        
        # Post-processing: remove accidental coordinate leakage and special tags
        output_text = re.sub(r'\(?\d{1,4},\s*\d{1,4}\)?', '', output_text)
        output_text = re.sub(r'<\|.*?\|>', '', output_text)
        output_text = output_text.strip()
        
        # Cleanup
        del inputs, generated_ids
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()
        
        return output_text
