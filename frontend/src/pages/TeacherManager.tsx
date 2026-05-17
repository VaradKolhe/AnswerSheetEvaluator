import React, { useEffect, useState, useCallback } from "react";
import {
  Plus,
  FileText,
  ArrowRight,
  Settings,
  GraduationCap,
  Trash2,
  Edit2,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { apiService } from "../services/api";
import { useAppStore } from "../store/useAppStore";

const TeacherManager: React.FC = () => {
  const { exams, setExams, setIsLoading } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newExam, setNewExam] = useState({
    exam_name: "",
    subject: "",
    total_marks: 100,
  });

  const fetchExams = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getExams();
      const safeData = Array.isArray(data) ? data : [];
      setExams(safeData);
    } catch (error) {
      console.error("Failed to fetch exams", error);
      setExams([]);
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setExams]);
  
  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.createExam(newExam);
      setIsModalOpen(false);
      setNewExam({ exam_name: "", subject: "", total_marks: 100 });
      fetchExams();
    } catch (error) {
      alert("Failed to create exam");
      console.error("Create exam error", error);
    }
  };

  const handleDelete = async (examId: string) => {
    if (!window.confirm("Are you sure you want to delete this exam? This will also delete all questions associated with it.")) {
      return;
    }

    try {
      await apiService.deleteExam(examId);
      fetchExams();
    } catch (error) {
      alert("Failed to delete exam");
      console.error("Delete exam error", error);
    }
  };

  const safeExams = Array.isArray(exams) ? exams : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Teacher Manager
          </h1>
          <p className="text-slate-500 font-medium">
            Create and manage your exams and students.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-900 hover:bg-blue-950 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/10"
        >
          <Plus size={20} />
          Create New Exam
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {safeExams.map((exam) => (
          <div
            key={exam.exam_id}
            className="group bg-white border border-slate-200 p-6 rounded-2xl hover:shadow-xl hover:border-blue-200 transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center text-blue-700 group-hover:bg-blue-700 group-hover:text-white transition-all">
                  <GraduationCap size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {exam.exam_name}
                  </h3>
                  <p className="text-slate-500 font-semibold text-xs uppercase tracking-wider">
                    {exam.subject}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(exam.exam_id)}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-50 p-3 rounded-xl text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Total Marks
                </p>
                <p className="text-lg font-bold text-slate-700">
                  {exam.total_marks}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Questions
                </p>
                <p className="text-lg font-bold text-slate-700">--</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Students
                </p>
                <p className="text-lg font-bold text-slate-700">--</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to={`/teacher-manager/exam/${exam.exam_id}/questions`}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-sm transition-all"
              >
                <Settings size={16} />
                Setup Questions
              </Link>
              <Link
                to={`/teacher-manager/exam/${exam.exam_id}/upload`}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 py-3 rounded-xl font-bold text-sm transition-all"
              >
                <FileText size={16} />
                Upload Sheets
              </Link>
              <Link
                to={`/teacher-manager/exam/${exam.exam_id}/review`}
                className="w-full flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-950 text-white py-3 rounded-xl font-bold text-sm transition-all mt-2"
              >
                View Students & Grades
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        ))}

        {safeExams.length === 0 && (
          <div className="col-span-full py-20 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-slate-50 rounded-full">
              <GraduationCap size={48} className="text-slate-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                No exams found
              </h3>
              <p className="text-slate-500">
                Create your first exam to start automating your grading.
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 text-blue-700 font-bold hover:underline"
            >
              Get started by creating an exam
            </button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 border border-slate-100 animate-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Create New Exam
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-50 rounded-lg text-slate-400"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 ml-1">
                  Exam Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midterm Examination 2024"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none font-semibold transition-all"
                  value={newExam.exam_name}
                  onChange={(e) =>
                    setNewExam({ ...newExam, exam_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 ml-1">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Computer Science"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none font-semibold transition-all"
                  value={newExam.subject}
                  onChange={(e) =>
                    setNewExam({ ...newExam, subject: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 ml-1">
                  Total Marks
                </label>
                <input
                  type="number"
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none font-semibold transition-all"
                  value={newExam.total_marks}
                  onChange={(e) =>
                    setNewExam({
                      ...newExam,
                      total_marks: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-900 text-white py-3 rounded-xl font-bold hover:bg-blue-950 transition-all shadow-lg shadow-blue-900/10"
                >
                  Create Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherManager;
