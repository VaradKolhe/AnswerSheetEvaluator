import re
from typing import List, Dict, Any

class SmartSegmenter:
    """
    Identifies question boundaries in extracted text to assign blocks 
    of text to specific questions. Ignores OCR noise like "AnsW1", "Anst", 
    or nested "Question> Answer>".
    """
    
    def __init__(self, question_count: int):
        self.question_count = question_count
        # This pattern catches "Ans", "Answer", "Q", "Question" followed by optional noise and numbers.
        # It also looks for these markers after a period or newline to handle fused text.
        self.marker_pattern = re.compile(r'(?i)(?:\b|\.|\n)\s*(?:ans|answer|q|question)[a-z]*\W*\d*[:\s-]*')

    def segment_text(self, aggregated_text: str) -> Dict[int, str]:
        """
        Splits the text into segments based on markers and assigns them 
        strictly sequentially (1, 2, 3...) to avoid OCR numbering errors.
        """
        text = aggregated_text.replace('\r\n', '\n').strip()
        
        matches = list(self.marker_pattern.finditer(text))
        
        if not matches:
            # If no markers, assume everything is for Question 1
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
