import React, { useEffect, useState, useCallback } from 'react';
import {
  FileText,
  Search,
  Download,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  X,
  BookOpen,
  User,
  Calendar,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { apiService } from '../services/api';
import { useAppStore } from '../store/useAppStore';

const Reports: React.FC = () => {
  const { exams, setExams, setIsLoading } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [previewReport, setPreviewReport] = useState<any | null>(null);

  const fetchExams = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getExams();
      setExams(data);
    } catch (error) {
      console.error('Failed to fetch exams', error);
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setExams]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const handleExamSelect = async (examId: string) => {
    setSelectedExamId(examId);
    setIsLoading(true);
    try {
      const data = await apiService.getSubmissions(examId);
      setSubmissions(data);
    } catch (error) {
      console.error('Failed to fetch submissions', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (submissionId: string, studentName: string) => {
    try {
      const blob = await apiService.downloadReport(submissionId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${studentName.replace(/\s+/g, '_')}_Report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Failed to download report');
    }
  };

  const handleViewReport = async (submissionId: string) => {
    setIsLoading(true);
    try {
      const gradingData = await apiService.getGradingResult(submissionId);
      setPreviewReport(gradingData);
    } catch (error) {
      alert('Failed to load report');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredExams = (Array.isArray(exams) ? exams : []).filter(e => e.exam_name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredSubmissions = (Array.isArray(submissions) ? submissions : []).filter(s => s.student_name.toLowerCase().includes(searchTerm.toLowerCase()));
  const selectedExam = exams.find(e => e.exam_id === selectedExamId);
  const reportPercentage = previewReport && selectedExam?.total_marks
    ? (previewReport.total_final_marks / selectedExam.total_marks) * 100
    : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Report Center</h1>
          <p className="text-slate-500 font-medium">Generate and download reports for exams or individual students.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search exams or students..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none font-semibold text-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {!selectedExamId ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredExams.map((exam) => (
            <div 
              key={exam.exam_id} 
              onClick={() => handleExamSelect(exam.exam_id)}
              className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-700 group-hover:bg-blue-700 group-hover:text-white transition-all">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 group-hover:text-blue-900">{exam.exam_name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{exam.subject}</p>
                  </div>
                </div>
                <button className="text-slate-300 group-hover:text-blue-600 transition-all">
                  <ArrowRight size={24} />
                </button>
              </div>
            </div>
          ))}
          {filteredExams.length === 0 && (
             <div className="col-span-full py-20 text-center text-slate-400">
                No exams found matching your search.
             </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setSelectedExamId(null)}
              className="flex items-center gap-2 text-blue-700 font-bold hover:underline text-sm"
            >
              <ArrowLeft size={16} />
              Back to Exams
            </button>
            <h2 className="text-xl font-bold text-slate-900">
               {selectedExam?.exam_name} Submissions
            </h2>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Student Name</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubmissions.map((s) => (
                  <tr key={s.submission_id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs uppercase">
                            {s.student_name[0]}
                         </div>
                         <span className="font-bold text-slate-700">{s.student_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                          s.status === 'finalized' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'
                       }`}>
                          {s.status}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {s.status === 'finalized' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewReport(s.submission_id)}
                            className="p-2 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                            title="View Report"
                          >
                            <ExternalLink size={20} />
                          </button>
                          <button 
                            onClick={() => handleDownload(s.submission_id, s.student_name)}
                            className="p-2 text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                            title="Download Report"
                          >
                            <Download size={20} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest px-2">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredSubmissions.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-medium italic">No students found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {previewReport && selectedExam && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-sm p-4 md:p-8 flex items-center justify-center">
          <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Student Report</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {selectedExam.exam_name} • {previewReport.student_name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(previewReport.submission_id, previewReport.student_name)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-950 transition-all"
                >
                  <Download size={16} />
                  Download
                </button>
                <button
                  onClick={() => setPreviewReport(null)}
                  className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                  title="Close Report"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="overflow-auto">
              <div className="p-8 bg-blue-900 text-white space-y-8">
                <div className="flex justify-between items-start gap-6">
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight">GradeAssist Performance</h3>
                    <p className="text-white/70 font-bold uppercase tracking-widest text-xs">Official Evaluation Document</p>
                  </div>
                  <div className="px-4 py-2 bg-white/10 rounded-xl border border-white/20">
                    <span className="text-[10px] font-black uppercase tracking-widest block opacity-70">Generated on</span>
                    <span className="text-sm font-bold">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest opacity-70"><BookOpen size={12} /> Classroom</span>
                    <p className="font-bold">N/A</p>
                  </div>
                  <div className="space-y-1">
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest opacity-70"><FileText size={12} /> Exam</span>
                    <p className="font-bold">{selectedExam.exam_name}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest opacity-70"><User size={12} /> Student</span>
                    <p className="font-bold">{previewReport.student_name}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest opacity-70"><Calendar size={12} /> Subject</span>
                    <p className="font-bold">{selectedExam.subject}</p>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-8">
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Q#</th>
                        <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Max</th>
                        <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">AI Marks</th>
                        <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Final Marks</th>
                        <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Feedback</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewReport.question_results.map((q: any) => (
                        <tr key={q.question_id}>
                          <td className="px-5 py-4 font-black text-sm">{q.question_no}</td>
                          <td className="px-5 py-4 font-bold text-sm">{q.max_marks}</td>
                          <td className="px-5 py-4 font-bold text-sm text-slate-500">{q.ai_marks}</td>
                          <td className="px-5 py-4 font-black text-sm text-blue-900">{q.final_marks}</td>
                          <td className="px-5 py-4 text-xs font-medium text-slate-500 italic max-w-xs truncate">
                            {q.teacher_comment || 'No specific feedback.'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Performance Summary</h4>
                    <div className="flex justify-between items-end border-b border-slate-200 pb-4">
                      <span className="text-xs font-bold text-slate-600">Total Marks Obtained</span>
                      <span className="text-2xl font-black text-slate-900">{previewReport.total_final_marks} / {selectedExam.total_marks}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-bold text-slate-600">Overall Percentage</span>
                      <span className="text-2xl font-black text-blue-900">{reportPercentage.toFixed(2)}%</span>
                    </div>
                  </div>

                  <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center text-center space-y-2 ${
                    reportPercentage >= 40 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'
                  }`}>
                    {reportPercentage >= 40 ? <CheckCircle2 size={44} /> : <XCircle size={44} />}
                    <h3 className="text-2xl font-black uppercase tracking-tight">Result: {reportPercentage >= 40 ? 'PASS' : 'FAIL'}</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
                      {reportPercentage >= 40 ? 'Meets academic standards' : 'Requires further review'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
