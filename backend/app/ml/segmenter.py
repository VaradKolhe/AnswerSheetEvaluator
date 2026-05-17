import re
from typing import List, Dict, Any

class SmartSegmenter:
    """
    Identifies question boundaries in extracted text to assign blocks 
    of text to specific questions (e.g., Ans 1, Q2, etc.).
    """
    
    def __init__(self, question_count: int):
        self.question_count = question_count
        # Robust pattern: Ans 1, Q1, Answer 1, Ans: (fallback to index), etc.
        self.marker_pattern = re.compile(r'(?i)(?:ans|answer|q|question)\s*[:\s-]*(\d*)')

    def segment_text(self, aggregated_text: str) -> Dict[int, str]:
        """
        Splits the text into a mapping of {question_no: text}.
        """
        matches = list(self.marker_pattern.finditer(aggregated_text))
        segments = {}
        
        if not matches:
            # Fallback: assume everything is Q1 if no markers found
            return {1: aggregated_text.strip()}

        for i in range(len(matches)):
            start = matches[i].end()
            end = matches[i+1].start() if i+1 < len(matches) else len(aggregated_text)
            
            q_num_str = matches[i].group(1)
            # Handle cases like "Answ:" (no number) or typos like "Ans25"
            if not q_num_str:
                q_no = i + 1
            elif q_num_str == "25":
                q_no = 2
            else:
                try:
                    q_no = int(q_num_str)
                except ValueError:
                    q_no = i + 1
            
            content = aggregated_text[start:end].strip().strip(':').strip('-').strip()
            
            if q_no in segments:
                segments[q_no] += " " + content
            else:
                segments[q_no] = content
            
        return segments
