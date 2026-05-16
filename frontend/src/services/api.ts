import axios from 'axios';
import { useAppStore } from '../store/useAppStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for Auth Token
api.interceptors.request.use((config) => {
  const token = useAppStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const apiService = {
  // Auth
  register: async (data: any) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },
  
  login: async (data: any) => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Exams
  createExam: async (data: any) => {
    const response = await api.post('/exams', data);
    return response.data;
  },
  
  getExams: async () => {
    const response = await api.get('/exams');
    return response.data;
  },

  getExamDetail: async (examId: string) => {
    const response = await api.get(`/exams/${examId}`);
    return response.data;
  },

  // Questions
  saveQuestions: async (questions: any[]) => {
    const response = await api.post('/questions', questions);
    return response.data;
  },

  getQuestions: async (examId: string) => {
    const response = await api.get(`/questions/${examId}`);
    return response.data;
  },

  // Submissions
  uploadFiles: async (examId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    const response = await api.post(`/submissions/upload/${examId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getSubmissions: async (examId: string) => {
    const response = await api.get(`/submissions/exam/${examId}`);
    return response.data;
  },

  getSubmissionDetail: async (id: string) => {
    const response = await api.get(`/submissions/${id}`);
    return response.data;
  },

  updateStudent: async (submissionId: string, name: string) => {
    const response = await api.put(`/submissions/${submissionId}`, { student_name: name });
    return response.data;
  },

  // Grading
  runGrading: async (submissionId: string) => {
    const response = await api.post(`/grading/run/${submissionId}`);
    return response.data;
  },

  getGradingResult: async (submissionId: string) => {
    const response = await api.get(`/grading/${submissionId}`);
    return response.data;
  },

  overrideGrading: async (submissionId: string, overrides: any[]) => {
    const response = await api.put(`/grading/override/${submissionId}`, { overrides });
    return response.data;
  },

  finalizeGrading: async (submissionId: string) => {
    const response = await api.post(`/grading/finalize/${submissionId}`);
    return response.data;
  },

  // Reports
  downloadReport: async (submissionId: string) => {
    const response = await api.get(`/reports/student/${submissionId}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Analytics
  getExamAnalytics: async (examId: string) => {
    const response = await api.get(`/analytics/exam/${examId}`);
    return response.data;
  }
};

export default api;
