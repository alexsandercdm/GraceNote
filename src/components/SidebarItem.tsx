import React from 'react';

export const SidebarItem = ({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${active ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' : 'text-slate-500 hover:bg-white hover:text-slate-800'}`}
  >
    <div className="w-6 h-6">{icon}</div>
    <span className="font-medium hidden md:block">{label}</span>
  </button>
);
