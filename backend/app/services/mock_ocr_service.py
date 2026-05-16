import asyncio
import random

async def get_mock_ocr_text(question_id: str, question_text: str):
    """
    Simulates OCR extraction per question.
    """
    await asyncio.sleep(0.5)
    
    # In a real app, this would process a specific crop of the PDF.
    responses = [
        f"The answer to '{question_text}' is related to the fundamental principles discussed in class.",
        f"Based on the provided diagram, the solution for {question_id} involves calculating the derivative.",
        "I believe the core concept here is thermal equilibrium which occurs when two objects reach the same temperature.",
        "The historical significance of this event lies in the industrial revolution which transformed global economies.",
        "The character's motivation is driven by their desire for redemption and social justice in a corrupt society."
    ]
    
    return random.choice(responses)
