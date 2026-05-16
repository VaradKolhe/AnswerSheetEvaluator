import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Upload, X, FileText, CheckCircle2, 
  Loader2, ArrowLeft, Rocket, Sparkles
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { apiService } from '../services/api';

const ExamUpload: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { selectedExam, setSelectedExam, setSubmissions } = useAppStore();
  
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('');

  useEffect(() => {
    if (examId) {
      fetchExam();
    }
  }, [examId]);

  const fetchExam = async () => {
    if (!examId) return;
    try {
      const data = await apiService.getExamDetail(examId);
      setSelectedExam(data);
    } catch (err) {
      console.error('Failed to fetch exam', err);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) {
      const pdfFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
      setFiles(prev => [...prev, ...pdfFiles]);
    }
  };

  const handleUpload = async () => {
    if (!examId || files.length === 0) return;
    
    setUploading(true);
    try {
      setCurrentStatus('Uploading PDF sheets...');
      const submissionsData = await apiService.uploadFiles(examId, files);
      setSubmissions(submissionsData);
      
      for (let i = 0; i < submissionsData.length; i++) {
        const sub = submissionsData[i];
        setCurrentStatus(`Processing ${sub.student_name} (${i+1}/${submissionsData.length})...`);
        await apiService.runGrading(sub.submission_id);
      }
      
      navigate(`/teacher-manager/exam/${examId}/review`);
    } catch (error) {
      console.error('Upload failed', error);
      alert('An error occurred during processing.');
    } finally {
      setUploading(false);
      setCurrentStatus('');
    }
  };

  if (!selectedExam) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
         <Link 
             to={`/teacher-manager`}
             className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-700 hover:border-blue-200 transition-all shadow-sm"
         >
             <ArrowLeft size={20} />
         </Link>
         <div>
             <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Batch Submission</h1>
             <p className="text-slate-500 font-semibold uppercase tracking-widest text-[10px]">Exam: {selectedExam.exam_name} • {selectedExam.subject}</p>
         </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-8">
        <div 
          className={`relative border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center transition-all duration-300 group ${
            dragActive ? 'border-blue-600 bg-blue-50 scale-[1.01]' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-6 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all">
            <Upload size={36} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Drag and Drop Student PDFs</h3>
          <p className="text-slate-500 mb-8 font-medium text-sm text-center leading-relaxed max-w-sm">
            Filenames should follow the student name format (e.g. <span className="text-slate-900 font-bold">john_doe.pdf</span>) for automatic recognition.
          </p>
          <label className="bg-blue-900 hover:bg-blue-950 text-white px-8 py-3 rounded-xl font-bold cursor-pointer transition-all shadow-lg shadow-blue-900/10">
            Browse Files
            <input 
              type="file" 
              multiple 
              accept=".pdf" 
              className="hidden" 
              onChange={(e) => e.target.files && setFiles(prev => [...prev, ...Array.from(e.target.files!)])} 
            />
          </label>
        </div>

        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
               <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selected: {files.length} Students</h4>
               <button onClick={() => setFiles([])} className="text-[10px] font-bold text-rose-600 uppercase hover:underline">Clear all</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {files.map((file, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl group">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText size={16} className="text-blue-600 shrink-0" />
                    <p className="text-xs font-bold text-slate-700 truncate">{file.name}</p>
                  </div>
                  <button onClick={() => setFiles(f => f.filter((_, idx) => idx !== i))} className="p-1 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {uploading ? (
          <div className="p-8 bg-blue-900 rounded-2xl space-y-4 shadow-xl shadow-blue-900/20">
            <div className="flex items-center justify-between text-white">
              <span className="flex items-center gap-3 text-sm font-bold uppercase tracking-wider">
                <Loader2 className="animate-spin" size={20} />
                {currentStatus}
              </span>
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
              <div className="bg-white h-full transition-all duration-500 w-[70%] animate-pulse"></div>
            </div>
          </div>
        ) : (
           <button 
             className="w-full bg-blue-900 hover:bg-blue-950 text-white py-5 rounded-2xl text-lg font-bold flex items-center justify-center gap-3 shadow-xl shadow-blue-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
             disabled={files.length === 0}
             onClick={handleUpload}
           >
             <Rocket size={24} />
             Start Batch Grading
           </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-white border border-slate-200 p-6 rounded-2xl flex gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
               <CheckCircle2 size={24} />
            </div>
            <div>
               <h5 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">OCR Data Mining</h5>
               <p className="text-xs text-slate-500 font-medium leading-relaxed">Extracts text from multi-page PDFs automatically using advanced OCR models.</p>
            </div>
         </div>
         <div className="bg-white border border-slate-200 p-6 rounded-2xl flex gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 shrink-0">
               <Sparkles size={24} />
            </div>
            <div>
               <h5 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">Semantic Logic</h5>
               <p className="text-xs text-slate-500 font-medium leading-relaxed">AI compares student intent with your model answers for accurate scoring.</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default ExamUpload;
