import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search, Download, ArrowRight, ArrowLeft, ExternalLink } from 'lucide-react';
import { apiService } from '../services/api';
import { useAppStore } from '../store/useAppStore';

const Reports: React.FC = () => {
  const { exams, setExams, setIsLoading } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);

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

  const filteredExams = (Array.isArray(exams) ? exams : []).filter(e => e.exam_name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredSubmissions = (Array.isArray(submissions) ? submissions : []).filter(s => s.student_name.toLowerCase().includes(searchTerm.toLowerCase()));

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
               {exams.find(e => e.exam_id === selectedExamId)?.exam_name} Submissions
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
                          <Link
                            to={`/report/${s.submission_id}`}
                            className="p-2 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                            title="View Report"
                          >
                            <ExternalLink size={20} />
                          </Link>
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
    </div>
  );
};

export default Reports;
