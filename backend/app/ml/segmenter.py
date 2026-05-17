import re
from typing import List, Dict, Any

class SmartSegmenter:
    """
    Identifies question boundaries in extracted text to assign blocks 
    of text to specific questions (e.g., Ans 1, Q2, etc.).
    """
    
    def __init__(self, question_count: int):
        self.question_count = question_count
        # Robust pattern from colab_script.py:
        # - More forgiving about boundaries and optional digit
        self.marker_pattern = re.compile(r'(?i)(?:ans|answer|q|question)\s*[:\s-]*(\d*)')

    def segment_text(self, aggregated_text: str) -> Dict[int, str]:
        """
        Splits the text into segments based on markers and assigns them 
        strictly sequentially (1, 2, 3...) to avoid OCR numbering errors.
        """
        text = aggregated_text.replace('\r\n', '\n').strip()
        
        matches = list(self.marker_pattern.finditer(text))
        segments = {}
        
        if not matches:
            # If no markers, assume everything is for Question 1
            return {1: text.strip()}

        for i in range(len(matches)):
            start = matches[i].end()
            end = matches[i+1].start() if i+1 < len(matches) else len(text)
            
            # The actual question number found by OCR is ignored to prevent 
            # misalignment (e.g. "AnsW1" or "Ans 25" mistakes).
            # We strictly assign based on the order of appearance.
            q_no = i + 1
            
            # Robust separator removal
            content = text[start:end].strip().strip(':').strip('-').strip()
            
            # If we somehow have multiple markers for the same logical position 
            # (unlikely with this loop), we append.
            if q_no in segments:
                segments[q_no] += " " + content
            else:
                segments[q_no] = content
            
        return segments
