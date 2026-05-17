import re
from typing import Dict

def segment_answers(text: str) -> Dict[int, str]:
    """
    Splits the aggregated text into logical segments based on answer markers.
    EXACTLY mirrors final_answersheet_evaluator.py logic.
    """
    # This pattern catches "Ans", "Answer", "Q", "Question" followed by optional noise and numbers.
    # It also looks for these markers after a period or newline to handle fused text.
    marker_pattern = re.compile(r'(?i)(?:\b|\.|\n)\s*(?:ans|answer|q|question)[a-z]*\W*\d*[:\s-]*')
    
    matches = list(marker_pattern.finditer(text))
    
    print(f"--- DEBUG: SEGMENTER MATCHES FOUND: {len(matches)} ---")
    for m in matches:
        print(f"  Match: '{m.group(0).strip()}' at index {m.start()}")
    
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

class SmartSegmenter:
    """
    Wrapper for the static segment_answers logic to maintain compatibility 
    with existing orchestrator.
    """
    def __init__(self, question_count: int = 0):
        self.question_count = question_count
        self.markers_found = False

    def segment_text(self, aggregated_text: str) -> Dict[int, str]:
        # Check if markers exist to set the flag
        marker_pattern = re.compile(r'(?i)(?:\b|\.|\n)\s*(?:ans|answer|q|question)[a-z]*\W*\d*[:\s-]*')
        if marker_pattern.search(aggregated_text):
            self.markers_found = True
        else:
            self.markers_found = False
            
        return segment_answers(aggregated_text)
