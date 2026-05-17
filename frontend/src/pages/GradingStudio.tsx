import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ChevronLeft, ChevronRight, Save, 
  CheckCircle2, XCircle, AlertTriangle,
  MessageSquare, FileText, Download,
  ArrowLeft, ZoomIn, ZoomOut, Check, X
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { apiService } from '../services/api';
import { useAppStore } from '../store/useAppStore';

// Set up PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const GradingStudio: React.FC = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const { 
    selectedSubmission, setSelectedSubmission, 
    gradingResult, setGradingResult,
    setIsLoading 
  } = useAppStore();

  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [overrides, setOverrides] = useState<{ [key: string]: { marks: number, comment: string } }>({});
  const [expandedText, setExpandedText] = useState<{ questionNo: number, text: string } | null>(null);

  const fetchData = useCallback(async () => {
    if (!submissionId) return;
    setIsLoading(true);
    try {
      const [submissionData, gradingData] = await Promise.all([
        apiService.getSubmissionDetail(submissionId),
        apiService.getGradingResult(submissionId)
      ]);
      setSelectedSubmission(submissionData);
      setGradingResult(gradingData);
      
      const initialOverrides: any = {};
      const safeResults = Array.isArray(gradingData.question_results) ? gradingData.question_results : [];
      safeResults.forEach((q: any) => {
        initialOverrides[q.question_id] = { marks: q.final_marks, comment: q.teacher_comment };
      });
      setOverrides(initialOverrides);
    } catch (error) {
      console.error('Failed to fetch grading studio data', error);
    } finally {
      setIsLoading(false);
    }
  }, [submissionId, setIsLoading, setSelectedSubmission, setGradingResult]);

  useEffect(() => {
    if (submissionId) {
      fetchData();
    }
  }, [submissionId, fetchData]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handleOverrideChange = (qId: string, field: 'marks' | 'comment', value: any) => {
    setOverrides({
      ...overrides,
      [qId]: { ...overrides[qId], [field]: value }
    });
  };

  const saveOverrides = async () => {
    if (!submissionId) return;
    setIsLoading(true);
    try {
      const payload = Object.entries(overrides).map(([qId, data]) => ({
        question_id: qId,
        final_marks: data.marks,
        teacher_comment: data.comment
      }));
      const updatedGrading = await apiService.overrideGrading(submissionId, payload);
      setGradingResult(updatedGrading);
      alert('Marks updated successfully!');
    } catch (error) {
      alert('Failed to save overrides');
    } finally {
      setIsLoading(false);
    }
  };

  const finalize = async () => {
    if (!submissionId) return;
    if (!confirm('Are you sure? This will finalize the marks and lock the submission.')) return;
    try {
      await apiService.finalizeGrading(submissionId);
      navigate(`/teacher-manager/exam/${selectedSubmission?.exam_id}/review`);
    } catch (error) {
      alert('Failed to finalize');
    }
  };

  if (!selectedSubmission || !gradingResult) return null;

  // Use the same getBaseUrl logic as api.ts to determine if we are in prod
  const getFileUrl = () => {
    // 1. If an environment variable is explicitly set, use it to derive the files path
    if (import.meta.env.VITE_API_URL) {
      // Production: Files are served via Nginx at /files/
      return `/files/${selectedSubmission.submission_id}.pdf`;
    }

    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      // Production fallback: Files are served via Nginx at /files/
      return `/files/${selectedSubmission.submission_id}.pdf`;
    }
    // Development fallback
    return `http://localhost:8000/files/${selectedSubmission.submission_id}.pdf`;
  };

  const pdfUrl = `${getFileUrl()}?t=${Date.now()}`;

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col lg:flex-row gap-6 animate-in fade-in duration-500 relative">
      {/* Expanded Text Modal */}
      {expandedText && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">Question {expandedText.questionNo} Full Extraction</h3>
              <button onClick={() => setExpandedText(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-8">
              <div className="text-sm leading-relaxed text-slate-700 font-medium whitespace-pre-wrap">
                {expandedText.text}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Panel */}
      <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md">
           <div className="flex items-center gap-4">
              <Link to={`/teacher-manager/exam/${selectedSubmission.exam_id}/review`} className="text-slate-400 hover:text-white transition-colors">
                 <ArrowLeft size={20} />
              </Link>
              <div className="space-y-0.5">
                 <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Answer Sheet</h4>
                 <p className="text-sm font-bold text-white">{selectedSubmission.student_name}</p>
              </div>
           </div>
           
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-xl border border-zinc-700">
                <button onClick={() => setPageNumber(Math.max(1, pageNumber - 1))} className="p-1 hover:bg-slate-700 rounded-lg text-slate-300">
                  <ChevronLeft size={18} />
                </button>
                <span className="text-[10px] font-bold text-white px-2">Page {pageNumber} of {numPages || '--'}</span>
                <button onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))} className="p-1 hover:bg-slate-700 rounded-lg text-slate-300">
                  <ChevronRight size={18} />
                </button>
              </div>
              <div className="flex items-center gap-1 bg-slate-800 p-1.5 rounded-xl border border-zinc-700">
                 <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-1 hover:bg-slate-700 rounded-lg text-slate-300"><ZoomOut size={18} /></button>
                 <button onClick={() => setScale(s => Math.min(2.5, s + 0.2))} className="p-1 hover:bg-slate-700 rounded-lg text-slate-300"><ZoomIn size={18} /></button>
              </div>
           </div>
        </div>
        
        <div className="flex-1 overflow-auto p-8 flex justify-center bg-slate-800/50">
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<div className="text-white font-bold animate-pulse">Loading Document...</div>}
          >
            <Page pageNumber={pageNumber} scale={scale} className="shadow-2xl rounded-lg" />
          </Document>
        </div>
      </div>

      {/* Grading Panel */}
      <div className="w-full lg:w-1/3 flex flex-col h-full space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl flex flex-col h-full overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
             <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Grading Panel</h3>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{gradingResult.student_name}</span>
                   <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                      gradingResult.status === 'finalized' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                   }`}>
                      {gradingResult.status}
                   </span>
                </div>
             </div>
             <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Total Score</p>
                <p className="text-2xl font-bold text-blue-900 leading-none">{gradingResult.total_final_marks.toFixed(1)} <span className="text-xs text-slate-400">/ {gradingResult.question_results.reduce((acc, q) => acc + q.max_marks, 0)}</span></p>
             </div>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {gradingResult.question_results.map((q) => (
              <div key={q.question_id} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-5 hover:border-blue-200 transition-colors group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-white text-blue-700 flex items-center justify-center font-bold text-sm border border-slate-200 shadow-sm">
                      {q.question_no}
                    </span>
                    <h5 className="font-bold text-slate-900 uppercase tracking-tight text-xs">Question {q.question_no}</h5>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Confidence:</span>
                     <span className={`text-[10px] font-bold ${q.confidence > 0.85 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {Math.round(q.confidence * 100)}%
                     </span>
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">OCR Extraction</p>
                        <button 
                          onClick={() => setExpandedText({ questionNo: q.question_no, text: q.extracted_answer })}
                          className="text-[9px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-tight transition-colors"
                        >
                          View Full Text
                        </button>
                      </div>
                      <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs leading-relaxed font-semibold italic text-slate-600 max-h-32 overflow-hidden relative group-hover:max-h-none transition-all duration-300">
                        "{q.extracted_answer}"
                        {q.extracted_answer.length > 150 && (
                          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none group-hover:hidden" />
                        )}
                      </div>
                   </div>

                   <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Semantic Match</p>
                      <div className="flex flex-wrap gap-1.5">
                        {q.matched_keywords.map(k => (
                          <span key={k} className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase rounded-md border border-emerald-100 flex items-center gap-1">
                            <Check size={10} /> {k}
                          </span>
                        ))}
                        {q.missing_keywords.map(k => (
                          <span key={k} className="px-2 py-1 bg-rose-50 text-rose-600 text-[9px] font-bold uppercase rounded-md border border-rose-100 flex items-center gap-1">
                            <X size={10} /> {k}
                          </span>
                        ))}
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4 items-end pt-4 border-t border-slate-200">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Awarded Marks</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        max={q.max_marks}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-blue-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all shadow-sm"
                        value={overrides[q.question_id]?.marks}
                        onChange={(e) => handleOverrideChange(q.question_id, 'marks', Number(e.target.value))}
                      />
                      <span className="text-[10px] font-bold text-slate-400">/ {q.max_marks}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-widest mb-1">AI Suggestion</span>
                    <span className="text-xl font-black text-blue-900/40">{q.ai_marks.toFixed(1)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <MessageSquare size={12} /> Feedback
                   </label>
                   <textarea 
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all placeholder:text-slate-300"
                    placeholder="Comment for student..."
                    value={overrides[q.question_id]?.comment}
                    onChange={(e) => handleOverrideChange(q.question_id, 'comment', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 border-t border-slate-200 bg-white space-y-3">
             <button 
                onClick={saveOverrides}
                className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm"
             >
                <Save size={16} /> Save Progress
             </button>
             <button 
                onClick={finalize}
                className="w-full flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-950 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={gradingResult.status === 'finalized'}
             >
                <CheckCircle2 size={16} />
                {gradingResult.status === 'finalized' ? 'Already Finalized' : 'Submit Final Grade'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GradingStudio;
