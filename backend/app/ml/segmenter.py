import re
from typing import List, Dict, Any

class SmartSegmenter:
    """
    Identifies question boundaries in extracted text to assign blocks 
    of text to specific questions (e.g., Ans 1, Q2, etc.).
    """
    
    def __init__(self, question_count: int):
        self.question_count = question_count
        # More flexible pattern: 
        # - Matches Ans1, Ans 1, Q.2, Q2, Question 3, etc.
        # - Optional period after the label
        # - No word boundary required before the digit
        self.marker_pattern = re.compile(r'(?i)(?:\bans|\banswer|\bq|\bquestion)\.?\s*[:\s-]*(\d+)')

    def segment_text(self, aggregated_text: str) -> Dict[int, str]:
        """
        Splits the text into a mapping of {question_no: text}.
        """
        text = aggregated_text.replace('\r\n', '\n').strip()
        
        matches = list(self.marker_pattern.finditer(text))
        segments = {}
        
        if not matches:
            return {} # Return empty to indicate total failure

        for i in range(len(matches)):
            start = matches[i].end()
            end = matches[i+1].start() if i+1 < len(matches) else len(text)
            
            q_num_str = matches[i].group(1)
            try:
                q_no = int(q_num_str)
            except (ValueError, TypeError):
                q_no = i + 1
            
            content = text[start:end].strip()
            content = re.sub(r'^[:\s\-\.]+', '', content).strip()
            
            if q_no in segments:
                segments[q_no] += "\n" + content
            else:
                segments[q_no] = content
            
        return segments
