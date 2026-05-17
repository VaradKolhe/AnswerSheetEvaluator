import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft, HelpCircle, GraduationCap, X } from 'lucide-react';
import { apiService } from '../services/api';
import { useAppStore } from '../store/useAppStore';

interface Question {
  question_no: number;
  question_text: string;
  expected_answer: string;
  keywords: string[];
  max_marks: number;
}

const QuestionSetup: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { selectedExam, setSelectedExam, setIsLoading } = useAppStore();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [tempKeyword, setTempKeyword] = useState<{ [key: number]: string }>({});

  const fetchData = useCallback(async () => {
    if (!examId) return;
    setIsLoading(true);
    try {
      const examData = await apiService.getExamDetail(examId);
      const questionsData = await apiService.getQuestions(examId);
      setSelectedExam(examData);
      const safeQuestionsData = Array.isArray(questionsData) ? questionsData : [];
      if (safeQuestionsData.length > 0) {
        setQuestions(safeQuestionsData.sort((a: any, b: any) => a.question_no - b.question_no));
      } else {
        // Default first question
        setQuestions([{
          question_no: 1,
          question_text: '',
          expected_answer: '',
          keywords: [],
          max_marks: 10
        }]);
      }
    } catch (error) {
      console.error('Failed to fetch exam data', error);
    } finally {
      setIsLoading(false);
    }
  }, [examId, setIsLoading, setSelectedExam]);

  useEffect(() => {
    if (examId) {
      fetchData();
    }
  }, [examId, fetchData]);

  const addQuestion = () => {
    const nextNo = questions.length + 1;
    setQuestions([...questions, {
      question_no: nextNo,
      question_text: '',
      expected_answer: '',
      keywords: [],
      max_marks: 10
    }]);
  };

  const removeQuestion = (index: number) => {
    const updated = questions.filter((_, i) => i !== index).map((q, i) => ({
      ...q,
      question_no: i + 1
    }));
    setQuestions(updated);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const addKeyword = (index: number) => {
    const keyword = tempKeyword[index]?.trim();
    if (keyword && !questions[index].keywords.includes(keyword)) {
      const updatedKeywords = [...questions[index].keywords, keyword];
      updateQuestion(index, 'keywords', updatedKeywords);
      setTempKeyword({ ...tempKeyword, [index]: '' });
    }
  };

  const removeKeyword = (qIndex: number, kIndex: number) => {
    const updatedKeywords = questions[qIndex].keywords.filter((_, i) => i !== kIndex);
    updateQuestion(qIndex, 'keywords', updatedKeywords);
  };

  const handleSave = async () => {
    if (!examId) return;
    setIsLoading(true);
    try {
      const payload = questions.map(q => ({ ...q, exam_id: examId }));
      await apiService.saveQuestions(payload);
      navigate(`/teacher-manager`);
    } catch (error) {
      alert('Failed to save questions');
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedExam) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            to={`/teacher-manager`}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-700 hover:border-blue-200 transition-all shadow-sm"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Question Setup</h1>
            <p className="text-slate-500 font-semibold uppercase tracking-widest text-[10px]">Exam: {selectedExam.exam_name} • {selectedExam.subject}</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          className="bg-blue-900 hover:bg-blue-950 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/10"
        >
          <Save size={18} />
          Save Questions
        </button>
      </div>

      <div className="space-y-6">
        {questions.map((q, index) => (
          <div key={index} className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6 relative overflow-hidden group transition-all hover:border-blue-200">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-100 group-hover:bg-blue-600 transition-colors"></div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm border border-blue-100">
                  {q.question_no}
                </span>
                <h3 className="text-lg font-bold text-slate-900">Question {q.question_no}</h3>
              </div>
              <button 
                onClick={() => removeQuestion(index)}
                className="text-slate-400 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 rounded-lg"
              >
                <Trash2 size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Question Prompt</label>
                <textarea 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none font-semibold text-sm min-h-[80px] transition-all"
                  placeholder="Enter the question text here..."
                  value={q.question_text}
                  onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Expected Model Answer</label>
                   <textarea 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none font-semibold text-sm min-h-[140px] transition-all"
                    placeholder="Provide the ideal answer for AI comparison..."
                    value={q.expected_answer}
                    onChange={(e) => updateQuestion(index, 'expected_answer', e.target.value)}
                  />
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Maximum Marks</label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none font-semibold text-sm transition-all"
                      value={q.max_marks}
                      onChange={(e) => updateQuestion(index, 'max_marks', Number(e.target.value))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                      Target Keywords <HelpCircle size={12} className="text-blue-600" />
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Add keyword..."
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none font-semibold text-sm transition-all"
                        value={tempKeyword[index] || ''}
                        onChange={(e) => setTempKeyword({...tempKeyword, [index]: e.target.value})}
                        onKeyPress={(e) => e.key === 'Enter' && addKeyword(index)}
                      />
                      <button 
                        onClick={() => addKeyword(index)}
                        className="px-4 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-all text-sm"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-3">
                      {q.keywords.map((k, kIdx) => (
                        <span key={kIdx} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold flex items-center gap-2 border border-blue-100 shadow-sm">
                          {k}
                          <button onClick={() => removeKeyword(index, kIdx)} className="hover:text-rose-600 transition-colors"><X size={12} /></button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        <button 
          onClick={addQuestion}
          className="w-full py-10 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-all">
            <Plus size={24} />
          </div>
          <span className="font-bold uppercase tracking-widest text-[10px]">Add New Question</span>
        </button>
      </div>
    </div>
  );
};

export default QuestionSetup;
