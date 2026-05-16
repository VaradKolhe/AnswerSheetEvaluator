from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from datetime import datetime
import os

REPORTS_DIR = "reports"
if not os.path.exists(REPORTS_DIR):
    os.makedirs(REPORTS_DIR)

async def generate_student_report(grading_result: dict, exam: dict, classroom: dict):
    """
    Generates a professional PDF report for a student.
    """
    submission_id = grading_result["submission_id"]
    student_name = grading_result["student_name"]
    file_path = os.path.join(REPORTS_DIR, f"report_{submission_id}.pdf")
    
    doc = SimpleDocTemplate(file_path, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    # Title
    title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], alignment=1, spaceAfter=20)
    elements.append(Paragraph("Smart Exam Performance Report", title_style))
    
    # Header Info
    header_data = [
        [f"Classroom: {classroom['classroom_name']}", f"Subject: {classroom['subject']}"],
        [f"Exam: {exam['exam_name']}", f"Date: {datetime.now().strftime('%Y-%m-%d')}"],
        [f"Student: {student_name}", ""]
    ]
    header_table = Table(header_data, colWidths=[250, 250])
    header_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 20))

    # Questions Table
    data = [["Q#", "Max Marks", "AI Marks", "Final Marks", "Teacher Comment"]]
    for q in grading_result["question_results"]:
        data.append([
            q["question_no"],
            q["max_marks"],
            q["ai_marks"],
            q["final_marks"],
            q["teacher_comment"] or "-"
        ])
    
    q_table = Table(data, colWidths=[30, 80, 80, 80, 230])
    q_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
    ]))
    elements.append(q_table)
    elements.append(Spacer(1, 30))

    # Summary
    total_max = exam["total_marks"]
    total_final = grading_result["total_final_marks"]
    percentage = (total_final / total_max) * 100 if total_max > 0 else 0
    status = "PASS" if percentage >= 40 else "FAIL"
    
    summary_data = [
        ["Metric", "Value"],
        ["Total Max Marks", total_max],
        ["Total AI Marks", grading_result["total_ai_marks"]],
        ["Total Final Marks", total_final],
        ["Percentage", f"{percentage:.2f}%"],
        ["Result", status]
    ]
    s_table = Table(summary_data, colWidths=[150, 150])
    s_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
    ]))
    elements.append(s_table)

    doc.build(elements)
    return file_path
