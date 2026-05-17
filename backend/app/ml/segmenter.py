import re
from typing import List, Dict, Any

class SmartSegmenter:
    """
    Identifies question boundaries in extracted text to assign blocks 
    of text to specific questions (e.g., Ans 1, Q2, etc.).
    """
    
    def __init__(self, question_count: int):
        self.question_count = question_count
        # Precise pattern: Matches "Ans 1", "Q. 2", "Question-3", "Answer 4:" at start of line or with space
        # Avoids matching inside words
        self.marker_pattern = re.compile(r'(?i)(?:\bans\b|\banswer\b|\bq\b|\bquestion\b)\s*[:\s-]*(\d+)')

    def segment_text(self, aggregated_text: str) -> Dict[int, str]:
        """
        Splits the text into a mapping of {question_no: text}.
        """
        # 1. Clean the text a bit to normalize line endings
        text = aggregated_text.replace('\r\n', '\n').strip()
        
        matches = list(self.marker_pattern.finditer(text))
        segments = {}
        
        if not matches:
            # Fallback: assume everything is Q1 if no markers found
            return {1: text}

        for i in range(len(matches)):
            start = matches[i].end()
            end = matches[i+1].start() if i+1 < len(matches) else len(text)
            
            q_num_str = matches[i].group(1)
            try:
                q_no = int(q_num_str)
            except (ValueError, TypeError):
                # Fallback to index if number extraction fails
                q_no = i + 1
            
            # Extract content and remove leading/trailing noise
            content = text[start:end].strip()
            content = re.sub(r'^[:\s\-\.]+', '', content).strip()
            
            if q_no in segments:
                # Merge if the student wrote the same answer twice or split across markers
                segments[q_no] += "\n" + content
            else:
                segments[q_no] = content
            
        return segments
