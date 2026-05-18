import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Download, ArrowLeft, CheckCircle2, 
  XCircle, FileText, User, Calendar, BookOpen
} from 'lucide-react';
import { apiService } from '../services/api';
import { useAppStore } from '../store/useAppStore';

const StudentReport: React.FC = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const { selectedExam, setSelectedExam, gradingResult, setGradingResult, setIsLoading } = useAppStore();
  const [classroom, setClassroom] = useState<any>(null);

  const fetchData = useCallback(async () => {
    if (!submissionId) return;
    setIsLoading(true);
    try {
      const gradingData = await apiService.getGradingResult(submissionId);
      setGradingResult(gradingData);
      
      const examData = await apiService.getExamDetail(gradingData.exam_id);
      setSelectedExam(examData);
      
      // Some versions might have classroom_id, some might not. 
      // Checking for existence before calling classroom service.
      if (examData.classroom_id && (apiService as any).getClassroomDetail) {
         const classroomData = await (apiService as any).getClassroomDetail(examData.classroom_id);
         setClassroom(classroomData);
      } else {
         setClassroom({ classroom_name: 'N/A' }); // Fallback
      }
    } catch (error) {
      console.error('Failed to fetch report data', error);
    } finally {
      setIsLoading(false);
    }
  }, [submissionId, setIsLoading, setGradingResult, setSelectedExam]);

  useEffect(() => {
    if (submissionId) {
      fetchData();
    }
  }, [submissionId, fetchData]);

  const handleDownload = async () => {
    if (!submissionId) return;
    try {
      const blob = await apiService.downloadReport(submissionId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Report_${gradingResult?.student_name}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      alert('Failed to download report');
    }
  };

  if (!submissionId || !gradingResult || !selectedExam || !classroom) return null;

  const percentage = (gradingResult.total_final_marks / selectedExam.total_marks) * 100;
  const isPass = percentage >= 40;
  const stampId = submissionId.split('-')[0].toUpperCase();

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            to={`/teacher-manager/exam/${selectedExam.exam_id}/review`}
            className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-all"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight">Student Report</h1>
            <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Previewing final assessment</p>
          </div>
        </div>
        <button 
          onClick={handleDownload}
          className="btn-primary px-8 py-3 uppercase tracking-widest text-xs shadow-xl shadow-primary/20"
        >
          <Download size={18} />
          Download PDF
        </button>
      </div>

      <div className="bg-white border border-border rounded-[2rem] shadow-xl overflow-hidden">
        {/* Report Header */}
        <div className="p-10 bg-primary text-white space-y-8">
           <div className="flex justify-between items-start">
              <div className="space-y-1">
                 <h2 className="text-2xl font-black uppercase tracking-tighter">GradeAssist Performance</h2>
                 <p className="text-primary-foreground/70 font-bold uppercase tracking-widest text-xs">Official Evaluation Document</p>
              </div>
              <div className="px-4 py-2 bg-white/10 rounded-xl border border-white/20 backdrop-blur-md">
                 <span className="text-[10px] font-black uppercase tracking-widest block opacity-70">Generated on</span>
                 <span className="text-sm font-bold">{new Date().toLocaleDateString()}</span>
              </div>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                 <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest opacity-70"><BookOpen size={12} /> Classroom</span>
                 <p className="font-bold">{classroom.classroom_name}</p>
              </div>
              <div className="space-y-1">
                 <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest opacity-70"><FileText size={12} /> Exam</span>
                 <p className="font-bold">{selectedExam.exam_name}</p>
              </div>
              <div className="space-y-1">
                 <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest opacity-70"><User size={12} /> Student</span>
                 <p className="font-bold">{gradingResult.student_name}</p>
              </div>
              <div className="space-y-1">
                 <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest opacity-70"><Calendar size={12} /> Subject</span>
                 <p className="font-bold">{selectedExam.subject}</p>
              </div>
           </div>
        </div>

        {/* Report Body */}
        <div className="p-10 space-y-10">
           <div className="bg-muted/30 border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-muted/50 border-b border-border">
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Q#</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Max</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">AI Marks</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Final Marks</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Feedback</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-border">
                    {gradingResult.question_results.map(q => (
                       <tr key={q.question_id}>
                          <td className="px-6 py-4 font-black text-sm">{q.question_no}</td>
                          <td className="px-6 py-4 font-bold text-sm">{q.max_marks}</td>
                          <td className="px-6 py-4 font-bold text-sm text-muted-foreground">{q.ai_marks}</td>
                          <td className="px-6 py-4 font-black text-sm text-primary">{q.final_marks}</td>
                          <td className="px-6 py-4 text-xs font-medium text-muted-foreground italic max-w-xs truncate">
                             {q.teacher_comment || 'No specific feedback.'}
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="p-8 bg-muted/20 border border-border rounded-3xl space-y-4">
                 <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Performance Summary</h4>
                 <div className="flex justify-between items-end border-b border-border pb-4">
                    <span className="text-xs font-bold">Total Marks Obtained</span>
                    <span className="text-2xl font-black text-foreground">{gradingResult.total_final_marks} / {selectedExam.total_marks}</span>
                 </div>
                 <div className="flex justify-between items-end">
                    <span className="text-xs font-bold">Overall Percentage</span>
                    <span className="text-2xl font-black text-primary">{percentage.toFixed(2)}%</span>
                 </div>
              </div>

              <div className={`p-8 rounded-3xl border flex flex-col items-center justify-center text-center space-y-2 ${
                 isPass ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'
              }`}>
                 {isPass ? <CheckCircle2 size={48} /> : <XCircle size={48} />}
                 <h3 className="text-2xl font-black uppercase tracking-tighter">Result: {isPass ? 'PASS' : 'FAIL'}</h3>
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
                    {isPass ? 'Meets academic standards' : 'Requires further review'}
                 </p>
              </div>
           </div>
        </div>

        {/* Report Footer */}
        <div className="px-10 py-6 bg-muted/30 border-t border-border flex justify-between items-center">
           <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Digital Stamp: AUTH-{stampId}</p>
           <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">GradeAssist AI-Verification Active</p>
        </div>
      </div>
    </div>
  );
};

export default StudentReport;
