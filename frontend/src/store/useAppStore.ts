import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
}

interface Exam {
  exam_id: string;
  exam_name: string;
  subject: string;
  total_marks: number;
  question_count?: number;
  submission_count?: number;
}

interface Question {
  question_id?: string;
  question_no: number;
  question_text: string;
  expected_answer: string;
  keywords: string[];
  max_marks: number;
}

interface Submission {
  submission_id: string;
  exam_id: string;
  student_name: string;
  original_filename: string;
  status: string;
  uploaded_at: string;
}

interface QuestionGradingResult {
  question_id: string;
  question_no: number;
  extracted_answer: string;
  matched_keywords: string[];
  missing_keywords: string[];
  ai_marks: number;
  final_marks: number;
  max_marks: number;
  confidence: number;
  teacher_comment: string;
}

interface GradingResult {
  grading_id: string;
  submission_id: string;
  exam_id: string;
  student_name: string;
  question_results: QuestionGradingResult[];
  total_ai_marks: number;
  total_final_marks: number;
  status: string;
}

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  
  // State Hierarchy
  exams: Exam[];
  selectedExam: Exam | null;
  questions: Question[];
  submissions: Submission[];
  selectedSubmission: Submission | null;
  gradingResult: GradingResult | null;
  
  // UI
  isLoading: boolean;
  loadingProgress: number;
  error: string | null;

  // Actions
  setAuth: (user: User | null, token: string | null) => void;
  logout: () => void;
  
  setExams: (exams: Exam[]) => void;
  setSelectedExam: (exam: Exam | null) => void;
  setQuestions: (questions: Question[]) => void;
  setSubmissions: (submissions: Submission[]) => void;
  setSelectedSubmission: (submission: Submission | null) => void;
  setGradingResult: (result: GradingResult | null) => void;
  
  setIsLoading: (isLoading: boolean) => void;
  setLoadingProgress: (progress: number) => void;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      exams: [],
      selectedExam: null,
      questions: [],
      submissions: [],
      selectedSubmission: null,
      gradingResult: null,
      isLoading: false,
      loadingProgress: 0,
      error: null,

      setAuth: (user, token) => set({ 
        user, 
        token, 
        isAuthenticated: !!token 
      }),
      
      logout: () => set({ 
        user: null, 
        token: null, 
        isAuthenticated: false,
        exams: [],
        selectedExam: null,
        questions: [],
        submissions: [],
        selectedSubmission: null,
        gradingResult: null
      }),

      setExams: (exams) => set({ exams }),
      setSelectedExam: (selectedExam) => set({ selectedExam }),
      setQuestions: (questions) => set({ questions }),
      setSubmissions: (submissions) => set({ submissions }),
      setSelectedSubmission: (selectedSubmission) => set({ selectedSubmission }),
      setGradingResult: (gradingResult) => set({ gradingResult }),
      
      setIsLoading: (isLoading) => set({ isLoading }),
      setLoadingProgress: (loadingProgress) => set({ loadingProgress }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'grade-assist-teacher-storage',
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
