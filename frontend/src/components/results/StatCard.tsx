import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  sub: string;
  icon: ReactNode;
}

export function StatCard({ title, value, sub, icon }: StatCardProps) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-slate-50 rounded-2xl group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <span className="text-2xl font-display font-black tracking-tight">{value}</span>
        <p className="text-[10px] text-slate-500 mt-1">{sub}</p>
      </div>
    </div>
  );
}
