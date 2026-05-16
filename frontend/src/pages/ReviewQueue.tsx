import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Search, Filter, ChevronRight, 
  CheckCircle2, Clock, AlertTriangle,
  ArrowLeft, FileText, Edit2, Check, X
} from 'lucide-react';
import { apiService } from '../services/api';
import { useAppStore } from '../store/useAppStore';

const ReviewQueue: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const { selectedExam, setSelectedExam, submissions, setSubmissions, setIsLoading } = useAppStore();
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (examId) {
      fetchData();
    }
  }, [examId]);

  const fetchData = async () => {
    if (!examId) return;
    setIsLoading(true);
    try {
      const [examData, submissionsData] = await Promise.all([
        apiService.getExamDetail(examId),
        apiService.getSubmissions(examId)
      ]);
      setSelectedExam(examData);
      setSubmissions(submissionsData);
    } catch (error) {
      console.error('Failed to fetch review data', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditName = async (id: string) => {
    try {
      await apiService.updateStudent(id, editName);
      setSubmissions(submissions.map(s => s.submission_id === id ? { ...s, student_name: editName } : s));
      setEditingId(null);
    } catch (error) {
      alert('Failed to update student name');
    }
  };

  const filteredSubmissions = submissions.filter(s => {
    const matchesSearch = s.student_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || s.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (!selectedExam) return null;

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div className="flex items-center gap-4">
            <Link 
                to={`/teacher-manager`}
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-700 hover:border-blue-200 transition-all shadow-sm"
            >
                <ArrowLeft size={20} />
            </Link>
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Review Queue</h1>
                <p className="text-slate-500 font-semibold uppercase tracking-widest text-[10px]">Exam: {selectedExam.exam_name} • {selectedExam.subject}</p>
            </div>
         </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search students..."
            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none font-semibold text-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter size={18} className="text-slate-400 mr-2 shrink-0" />
          {['all', 'pending', 'graded', 'finalized'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all shrink-0 ${
                filterStatus === status 
                ? 'bg-blue-900 text-white border-blue-900 shadow-lg shadow-blue-900/10' 
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Student Name</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Uploaded</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubmissions.map((s) => (
                <tr key={s.submission_id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 font-bold uppercase border border-blue-100">
                          {s.student_name[0]}
                        </div>
                        {editingId === s.submission_id ? (
                          <div className="flex items-center gap-2">
                            <input 
                              autoFocus
                              type="text"
                              className="px-3 py-1 bg-white border border-blue-400 rounded-lg outline-none font-bold text-slate-900 text-sm"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleEditName(s.submission_id)}
                            />
                            <button onClick={() => handleEditName(s.submission_id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                              <Check size={16} />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1 text-rose-600 hover:bg-rose-50 rounded">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{s.student_name}</span>
                            <button 
                              onClick={() => { setEditingId(s.submission_id); setEditName(s.student_name); }}
                              className="p-1 text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Edit2 size={14} />
                            </button>
                          </div>
                        )}
                     </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                     <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                        s.status === 'finalized' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        s.status === 'graded' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        'bg-slate-50 text-slate-500 border-slate-200'
                     }`}>
                        {s.status === 'finalized' ? <CheckCircle2 size={12} /> : 
                         s.status === 'graded' ? <AlertTriangle size={12} /> : <Clock size={12} />}
                        {s.status}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-medium text-slate-500">
                    {new Date(s.uploaded_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                     <div className="flex items-center justify-end gap-3">
                        {s.status === 'finalized' && (
                          <Link 
                            to={`/report/${s.submission_id}`}
                            className="p-2 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                            title="View Report"
                          >
                            <FileText size={20} />
                          </Link>
                        )}
                        <Link 
                          to={`/grading/${s.submission_id}`}
                          className="flex items-center gap-2 bg-slate-100 hover:bg-blue-900 hover:text-white text-slate-700 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                        >
                          Review Marks <ChevronRight size={14} />
                        </Link>
                     </div>
                  </td>
                </tr>
              ))}
              
              {filteredSubmissions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-slate-400 italic font-medium">
                     No submissions matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReviewQueue;
