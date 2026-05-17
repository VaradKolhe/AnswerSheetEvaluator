import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Upload, X, FileText, CheckCircle2, 
  Loader2, ArrowLeft, Rocket, Sparkles
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { apiService } from '../services/api';

const ProgressLoader: React.FC<{ status: string, progress: number }> = ({ status, progress }) => {
  return (
    <div className="p-8 bg-blue-900 rounded-3xl space-y-6 shadow-2xl shadow-blue-900/40 animate-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between text-white">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-200" size={24} />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-blue-200 leading-none mb-1">System Processing</p>
            <h4 className="text-lg font-bold text-white leading-tight">{status}</h4>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-white leading-none">{Math.round(progress)}%</p>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden p-0.5 border border-white/5">
          <div 
            className="bg-gradient-to-r from-blue-400 to-indigo-300 h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_15px_rgba(147,197,253,0.5)]"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-bold text-blue-300 uppercase tracking-tighter">Initializing AI Core</span>
          <span className="text-[10px] font-bold text-blue-300 uppercase tracking-tighter">Extracting Insights</span>
        </div>
      </div>

      <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
         <p className="text-[11px] text-blue-100 font-medium leading-relaxed italic opacity-80">
            "We are using Qwen2-VL Multimodal LLM to transcribe handwritten text. This involves complex vision-language processing and may take a moment."
         </p>
      </div>
    </div>
  );
};

const ExamUpload: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { selectedExam, setSelectedExam, setSubmissions } = useAppStore();
  
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('');
  const [progress, setProgress] = useState(0);

  // ... rest of logic ...

  const handleUpload = async () => {
    if (!examId || files.length === 0) return;
    
    setUploading(true);
    setProgress(0);

    // Simulated progress logic
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev < 40) return prev + 2; // Fast initial progress
        if (prev < 80) return prev + 0.5; // Slower processing
        if (prev < 98) return prev + 0.1; // Waiting for backend
        return prev;
      });
    }, 100);

    try {
      setCurrentStatus('Uploading PDF sheets...');
      const submissionsData = await apiService.uploadFiles(examId, files);
      setSubmissions(submissionsData);
      
      for (let i = 0; i < submissionsData.length; i++) {
        const sub = submissionsData[i];
        setCurrentStatus(`AI Analysis: ${sub.student_name} (${i+1}/${submissionsData.length})...`);
        await apiService.runGrading(sub.submission_id);
      }
      
      setProgress(100);
      setTimeout(() => navigate(`/teacher-manager/exam/${examId}/review`), 500);
    } catch (error) {
      console.error('Upload failed', error);
      alert('An error occurred during processing. Please check if the backend is running with GPU.');
    } finally {
      clearInterval(interval);
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
        {!uploading ? (
          <>
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

            <button 
              className="w-full bg-blue-900 hover:bg-blue-950 text-white py-5 rounded-2xl text-lg font-bold flex items-center justify-center gap-3 shadow-xl shadow-blue-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              disabled={files.length === 0}
              onClick={handleUpload}
            >
              <Rocket size={24} />
              Start Batch Grading
            </button>
          </>
        ) : (
          <ProgressLoader status={currentStatus} progress={progress} />
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
