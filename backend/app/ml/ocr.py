"""
modules/ocr.py
Handwriting extraction using Qwen2-VL (Multimodal LLM).
Provides high-accuracy full-page OCR for dense handwritten text.
"""

from __future__ import annotations

import torch
import os
import re
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
            torch_dtype=torch.bfloat16, 
            device_map="auto",
            trust_remote_code=True
        )
        self.processor = AutoProcessor.from_pretrained(model_id, trust_remote_code=True)

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
                        "max_pixels": 2048 * 28 * 28, # Increased for high-res scans
                    },
                    {
                        "type": "text", 
                        "text": "Transcribe all handwritten text in this image precisely. DO NOT output coordinates. Read every word."
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
                max_new_tokens=4096,
                do_sample=False
            )
        
        generated_ids_trimmed = [
            out_ids[len(in_ids) :] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
        ]
        output_text = self.processor.batch_decode(
            generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False
        )[0]
        
        # Post-processing: remove accidental coordinate leakage
        output_text = re.sub(r'\(\d{1,4},\s*\d{1,4}\)', '', output_text).strip()
        
        # Cleanup
        del inputs, generated_ids
        torch.cuda.empty_cache()
        
        return output_text
