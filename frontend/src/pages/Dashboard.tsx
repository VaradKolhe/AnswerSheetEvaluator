import React, { useEffect, useState, useCallback } from 'react';
import { 
  Clock, CheckCircle2,
  ArrowRight, GraduationCap,
  Zap, PlusCircle, ClipboardList, TrendingUp, Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { useAppStore } from '../store/useAppStore';

const StatCard = ({ title, value, icon: Icon, colorClass, trend }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm group hover:shadow-md transition-all duration-300">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl ${colorClass}`}>
        <Icon size={24} />
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
           <TrendingUp size={14} />
           <span className="text-[10px] font-bold">{trend}</span>
        </div>
      )}
    </div>
    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
    <div className="mt-1">
      <span className="text-3xl font-bold text-slate-900">{value}</span>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { user, exams, setExams, setIsLoading } = useAppStore();
  const [stats, setStats] = useState({ exams: 0, submissions: 0, pending: 0, finalized: 0 });

  
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const examsData = await apiService.getExams();
      setExams(examsData);
      
      let totalSubmissions = 0;
      let pendingReviews = 0;
      let finalizedSubmissions = 0;

      for (const exam of examsData) {
        const subs = await apiService.getSubmissions(exam.exam_id);
        totalSubmissions += subs.length;
        pendingReviews += subs.filter((s: any) => s.status === 'graded' || s.status === 'pending').length;
        finalizedSubmissions += subs.filter((s: any) => s.status === 'finalized').length;
      }

      setStats({
        exams: examsData.length,
        submissions: totalSubmissions,
        pending: pendingReviews,
        finalized: finalizedSubmissions
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setExams]);
  
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);
  
  const statCards = [
    { title: 'Total Exams', value: stats.exams, icon: ClipboardList, colorClass: 'bg-blue-50 text-blue-700', trend: '+12%' },
    { title: 'Total Students', value: stats.submissions, icon: Users, colorClass: 'bg-indigo-50 text-indigo-700', trend: '+5%' },
    { title: 'Pending Reviews', value: stats.pending, icon: Clock, colorClass: 'bg-amber-50 text-amber-700' },
    { title: 'Finalized', value: stats.finalized, icon: CheckCircle2, colorClass: 'bg-emerald-50 text-emerald-700' },
  ];

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      {/* Welcome Banner */}
      <div className="bg-blue-900 rounded-3xl p-10 shadow-xl shadow-blue-900/10 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Welcome back, <br /><span className="text-blue-200">Prof. {user?.name?.split(' ')[0] || 'Teacher'}</span>
            </h1>
            <p className="text-blue-100 text-lg font-medium max-w-md opacity-80 leading-relaxed">
              Your AI-assisted grading dashboard is up to date. You have <span className="text-white font-bold">{stats.pending} assessments</span> waiting for your final review.
            </p>
            <div className="flex flex-wrap gap-4 pt-4 justify-center md:justify-start">
              <Link 
                to="/teacher-manager"
                className="bg-white text-blue-900 px-8 py-3.5 rounded-xl font-bold text-sm shadow-lg hover:bg-blue-50 transition-all flex items-center gap-2"
              >
                Go to Teacher Manager
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
          <div className="hidden lg:block">
             <div className="w-48 h-48 bg-white/10 rounded-3xl rotate-12 flex items-center justify-center backdrop-blur-sm border border-white/20">
                <GraduationCap size={100} className="text-white/40 -rotate-12" />
             </div>
          </div>
        </div>
        {/* Abstract Shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Exams Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Recent Exams</h2>
            <Link to="/teacher-manager" className="text-xs font-bold text-blue-700 flex items-center hover:underline uppercase tracking-wider">
              View All <ArrowRight size={14} className="ml-1.5" />
            </Link>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Exam Name</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Subject</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Date</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exams.slice(0, 5).map((exam, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-bold text-slate-900">{exam.exam_name}</td>
                    <td className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-widest text-[10px]">{exam.subject}</td>
                    <td className="px-6 py-4 text-center text-slate-400 font-medium">
                       {new Date(exam.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/teacher-manager/exam/${exam.exam_id}/review`} className="text-blue-700 p-2 hover:bg-blue-50 rounded-lg inline-block transition-all">
                        <ArrowRight size={18} />
                      </Link>
                    </td>
                  </tr>
                ))}                
                {exams.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                      No exams created yet. <Link to="/teacher-manager" className="text-blue-700 not-italic font-bold hover:underline ml-2">Start now</Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Tips / Help */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight px-2">System Insights</h2>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100"><Zap size={20} /></div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">Batch PDF Support</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Upload multiple student answer sheets at once. Our AI handles splitting and student recognition automatically.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100"><CheckCircle2 size={20} /></div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">Semantic Matching</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  The engine looks for conceptual intent, not just exact words. Use target keywords to refine AI precision.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100"><PlusCircle size={20} /></div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">Grading Studio</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Review AI suggestions side-by-side with original student handwriting in our immersive studio.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
