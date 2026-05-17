import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { apiService } from '../services/api';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAppStore((state) => state.setAuth);
  const globalError = useAppStore((state) => state.error);
  const clearGlobalError = useAppStore((state) => state.setError);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (globalError) {
      setError(globalError);
      // Clear it from the store so it doesn't persist
      clearGlobalError(null);
    }
  }, [globalError, clearGlobalError]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await apiService.login({ email, password });
      
      // Store token first to allow getMe to work
      setAuth(null, response.access_token);
      
      // Fetch user details
      const userData = await apiService.getMe();
      setAuth(userData, response.access_token);
      
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Side - Hero Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img 
          src={`/hero.png`}
          alt="Education Dashboard" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-12 text-white">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
               <div className="w-4 h-4 bg-white rounded-sm rotate-45" />
            </div>
            <span className="text-xl font-bold tracking-tight">EduTrack Portal</span>
          </div>
          <h1 className="text-5xl font-bold mb-6 max-w-md leading-tight">
            Empowering educators with clarity.
          </h1>
          <p className="text-lg text-white/80 max-w-sm leading-relaxed">
            Access your gradebooks, student records, and assignments in one secure, unified interface designed for high-performance teaching.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-slate-900">Welcome back</h2>
            <p className="text-slate-500">Please enter your institutional details to sign in.</p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Institutional Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="email" 
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                  placeholder="teacher@institution.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="password" 
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="remember" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer" />
                <label htmlFor="remember" className="text-sm text-slate-600 cursor-pointer">Remember me</label>
              </div>
              <Link to="#" className="text-sm font-semibold text-blue-700 hover:text-blue-800">Forgot password?</Link>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-900 hover:bg-blue-950 text-white py-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" /> : <>Sign In <ArrowRight size={20} /></>}
            </button>
          </form>

          <div className="text-center pt-4">
            <span className="text-slate-500 text-sm">Don't have an account? </span>
            <Link to="/register" className="text-blue-700 font-semibold hover:underline text-sm">Create Account</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
