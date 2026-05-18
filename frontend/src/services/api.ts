import axios from 'axios';
import { useAppStore } from '../store/useAppStore';

const getBaseUrl = () => {
  // 1. If an environment variable is explicitly set, use it.
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;

  // 2. Check if we are running in a production browser environment (served via Nginx)
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return '/api';
    }
  }

  // 3. Fallback for local development
  return 'http://localhost:8000';
};

const API_BASE_URL = getBaseUrl();
// Ensure baseURL ends with a slash to work correctly with relative paths
const normalizedBaseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;

const api = axios.create({
  baseURL: normalizedBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for URL normalization and Auth Token
api.interceptors.request.use((config) => {
  // 1. URL Normalization: Remove leading slash to ensure it appends to baseURL subpath
  if (config.url && config.url.startsWith('/')) {
    config.url = config.url.substring(1);
  }

  // 2. Auth Token
  const token = useAppStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for handling errors globally (e.g., 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token is invalid or expired
      const { logout, setError } = useAppStore.getState();
      logout();
      setError('Session expired. Please login again.');
      
      // Optionally redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  // Auth
  register: async (data: any) => {
    const response = await api.post('auth/register', data);
    return response.data;
  },
  
  login: async (data: any) => {
    const response = await api.post('auth/login', data);
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('auth/me');
    return response.data;
  },

  // Exams
  createExam: async (data: any) => {
    const response = await api.post('exams/', data);
    return response.data;
  },
  
  getExams: async () => {
    const response = await api.get('exams/');
    return response.data;
  },

  updateExam: async (examId: string, data: any) => {
    const response = await api.put(`exams/${examId}`, data);
    return response.data;
  },

  getExamDetail: async (examId: string) => {
    const response = await api.get(`exams/${examId}`);
    return response.data;
  },

  deleteExam: async (examId: string) => {
    const response = await api.delete(`exams/${examId}`);
    return response.data;
  },

  // Questions
  saveQuestions: async (questions: any[]) => {
    const response = await api.post('questions/', questions);
    return response.data;
  },

  getQuestions: async (examId: string) => {
    const response = await api.get(`questions/${examId}`);
    return response.data;
  },

  // Submissions
  uploadFiles: async (examId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    const response = await api.post(`submissions/upload/${examId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getSubmissions: async (examId: string) => {
    const response = await api.get(`submissions/exam/${examId}`);
    return response.data;
  },

  getSubmissionDetail: async (id: string) => {
    const response = await api.get(`submissions/${id}`);
    return response.data;
  },

  updateStudent: async (submissionId: string, name: string) => {
    const response = await api.put(`submissions/${submissionId}`, { student_name: name });
    return response.data;
  },

  deleteSubmission: async (submissionId: string) => {
    const response = await api.delete(`submissions/${submissionId}`);
    return response.data;
  },

  // Grading
  runGrading: async (submissionId: string) => {
    const response = await api.post(`grading/run/${submissionId}`);
    return response.data;
  },

  getGradingResult: async (submissionId: string) => {
    const response = await api.get(`grading/${submissionId}`);
    return response.data;
  },

  overrideGrading: async (submissionId: string, overrides: any[]) => {
    const response = await api.put(`grading/override/${submissionId}`, { overrides });
    return response.data;
  },

  finalizeGrading: async (submissionId: string) => {
    const response = await api.post(`grading/finalize/${submissionId}`);
    return response.data;
  },

  // Reports
  downloadReport: async (submissionId: string) => {
    const response = await api.get(`reports/student/${submissionId}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Analytics
  getExamAnalytics: async (examId: string) => {
    const response = await api.get(`analytics/exam/${examId}`);
    return response.data;
  }
};

export default api;
