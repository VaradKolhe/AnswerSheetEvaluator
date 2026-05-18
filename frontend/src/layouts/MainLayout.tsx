import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users,
  FileText,
  LogOut,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAppStore } from '../store/useAppStore';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SidebarItem = ({ icon: Icon, label, href, active }: { icon: any, label: string, href: string, active: boolean }) => (
  <Link
    to={href}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
      active 
        ? "bg-blue-50 text-blue-700 font-bold border-r-4 border-blue-700 rounded-r-none" 
        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
    )}
  >
    <Icon size={20} className={cn(active ? "text-blue-700" : "text-slate-400 group-hover:text-slate-600")} />
    <span className="text-sm flex-1">{label}</span>
    {active && <ChevronRight size={14} />}
  </Link>
);

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isLoading, loadingProgress } = useAppStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: Users, label: 'Teacher Manager', href: '/teacher-manager' },
    { icon: FileText, label: 'Reports', href: '/reports' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 relative">
      {/* Global Loader Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/60 backdrop-blur-md transition-all duration-300 animate-in fade-in">
           <div className="bg-white p-10 rounded-3xl shadow-2xl border border-slate-100 flex flex-col items-center gap-6 animate-in zoom-in-95 duration-200 w-80">
              <div className="relative w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 bg-blue-900 transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-900 tracking-tight">Processing Request</p>
                  <span className="text-[10px] font-black text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100">{Math.round(loadingProgress)}%</span>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Preparing your dashboard...</p>
              </div>
           </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform duration-300 lg:relative lg:translate-x-0",
        !isMobileMenuOpen && "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo/Header Area */}
          <div className="p-6 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-900 rounded flex items-center justify-center text-white font-bold text-lg">
                ET
              </div>
              <div className="flex flex-col">
                <h1 className="text-sm font-bold text-slate-900">Main Menu</h1>
                <p className="text-[10px] text-slate-400 font-medium">Academic Year 2026-27</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {navItems.map((item) => (
              <SidebarItem 
                key={item.href}
                {...item}
                active={location.pathname === item.href || (item.href !== '/dashboard' && location.pathname.startsWith(item.href))}
              />
            ))}
          </nav>

          <div className="p-4 bg-slate-50/50 border-t border-slate-100">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 shadow-sm border border-blue-200 uppercase">
                {user?.name?.[0] || 'T'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate text-slate-900">{user?.name || 'Dr. Sarah Jenkins'}</p>
                <p className="text-[10px] text-slate-500 truncate font-medium uppercase tracking-wider">Computer Science</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 lg:px-10 gap-4">
          <button 
            className="lg:hidden p-2 hover:bg-slate-100 rounded-md text-slate-600"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900">
              {navItems.find(item => location.pathname.startsWith(item.href))?.label || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Active</span>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-slate-50">
          <div className="p-6 lg:p-10">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
