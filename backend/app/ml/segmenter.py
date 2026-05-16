import re
from typing import List, Dict, Any

class SmartSegmenter:
    """
    Identifies question boundaries in extracted text to assign blocks 
    of text to specific questions (e.g., Ans 1, Q2, etc.).
    """
    
    def __init__(self, question_count: int):
        self.question_count = question_count
        # Pattern to find things like "Ans 1:", "Answer 1.", "1)", "Q1."
        self.marker_pattern = re.compile(
            r'(?:^|\n)\s*(?:Ans(?:wer)?|Q(?:uestion)?|[Qq])?\s*[:\.]?\s*(\d+)\s*[:\.\)]',
            re.IGNORECASE
        )

    def segment_text(self, aggregated_text: str) -> Dict[int, str]:
        """
        Splits the text into a mapping of {question_no: text}.
        If no markers are found, it falls back to providing the whole text 
        to all questions (current behavior).
        """
        segments = {}
        
        # Find all matches for "Ans 1", "Ans 2", etc.
        matches = list(self.marker_pattern.finditer(aggregated_text))
        
        if not matches:
            # Fallback: No markers found
            return {i: aggregated_text for i in range(1, self.question_count + 1)}

        # Process segments between markers
        for i in range(len(matches)):
            current_match = matches[i]
            q_no = int(current_match.group(1))
            
            # Start of text is right after the marker
            start_idx = current_match.end()
            
            # End of text is the start of the next marker, or end of string
            end_idx = matches[i+1].start() if i+1 < len(matches) else len(aggregated_text)
            
            segment_text = aggregated_text[start_idx:end_idx].strip()
            
            # If we already have a segment for this question, append to it
            if q_no in segments:
                segments[q_no] += "\n" + segment_text
            else:
                segments[q_no] = segment_text

        # Ensure all questions have at least some text assigned
        # (even if it's empty if they didn't write it)
        final_map = {}
        for i in range(1, self.question_count + 1):
            final_map[i] = segments.get(i, "")
            
        return final_map
