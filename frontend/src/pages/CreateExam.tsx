import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, FileText, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';

interface Question {
  q_no: number;
  model_answer: string;
  keywords: string;
  max_marks: number;
}

const CreateExam: React.FC = () => {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [totalMarks, setTotalMarks] = useState(100);
  const [questions, setQuestions] = useState<Question[]>([
    { q_no: 1, model_answer: '', keywords: '', max_marks: 10 }
  ]);
  const [loading, setLoading] = useState(false);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { q_no: questions.length + 1, model_answer: '', keywords: '', max_marks: 10 }
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const newQuestions = [...questions];
    (newQuestions[index] as any)[field] = value;
    setQuestions(newQuestions);
  };

  const handleSave = async () => {
    if (!subject || questions.length === 0) {
      alert('Please fill in the subject and add at least one question.');
      return;
    }
    
    setLoading(true);
    try {
      const formattedQuestions = questions.map(q => ({
        ...q,
        keywords: q.keywords.split(',').map(k => k.trim()).filter(k => k !== '')
      }));
      
      await apiService.createExam({
        subject,
        total_marks: totalMarks,
        questions: formattedQuestions
      });
      
      alert('Exam created successfully!');
      navigate('/upload');
    } catch (error) {
      console.error('Failed to create exam', error);
      alert('Failed to create exam. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Create New Exam</h1>
          <p className="text-muted-foreground">Define your marking scheme and keywords</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold btn-vibrant disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
          Save Exam Template
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Basic Settings */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FileText className="text-primary" size={20} /> General Info
            </h3>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Exam Subject</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 bg-background/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                placeholder="e.g. Computer Science Midterm"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Total Possible Marks</label>
              <input 
                type="number" 
                className="w-full px-4 py-2 bg-background/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                value={totalMarks}
                onChange={(e) => setTotalMarks(Number(e.target.value))}
              />
            </div>
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 flex gap-3 text-sm">
              <AlertCircle size={20} className="text-primary shrink-0" />
              <p className="text-muted-foreground italic">
                Our AI uses these keywords to find semantically matching answers. 
                Separate multiple keywords with commas.
              </p>
            </div>
          </div>
        </div>

        {/* Question List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            {questions.map((q, index) => (
              <div key={index} className="bg-card/30 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-lg space-y-4 group animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-secondary text-secondary-foreground rounded-lg flex items-center justify-center font-bold">
                      {q.q_no}
                    </span>
                    <h4 className="font-bold text-lg text-foreground">Question Details</h4>
                  </div>
                  <button 
                    onClick={() => removeQuestion(index)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-semibold">Model Answer / Reference Text</label>
                    <textarea 
                      className="w-full px-4 py-2 bg-background/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-secondary outline-none min-h-[80px]"
                      placeholder="Enter the ideal answer..."
                      value={q.model_answer}
                      onChange={(e) => updateQuestion(index, 'model_answer', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Keywords (comma separated)</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 bg-background/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-secondary outline-none"
                      placeholder="logic, algorithm, process..."
                      value={q.keywords}
                      onChange={(e) => updateQuestion(index, 'keywords', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Max Marks</label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-2 bg-background/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-secondary outline-none"
                      value={q.max_marks}
                      onChange={(e) => updateQuestion(index, 'max_marks', Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={addQuestion}
            className="w-full py-4 border-2 border-dashed border-white/20 rounded-2xl flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:bg-white/5 hover:border-white/40 transition-all font-bold"
          >
            <Plus size={20} /> Add Another Question
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateExam;
