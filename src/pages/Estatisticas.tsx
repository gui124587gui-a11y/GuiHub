import React, { useState, useEffect } from 'react';
import { BarChart3, Clock, Monitor, Terminal, Globe, Calendar, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAppStore } from '@/store/useAppStore';

// Format seconds to hours and minutes
function formatUptime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export default function Estatisticas() {
  const { stats, history } = useAppStore();
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [uptime, setUpTime] = useState(0);
  const [processCount, setProcessCount] = useState(0);
  const totalMinutes = stats.reduce((acc, item) => acc + item.duration, 0);
  const weeklyData = stats.slice(0, 7).map((item) => ({ name: item.appName.slice(0, 3), horas: Number((item.duration / 60).toFixed(1)) }));
  const monthlyData = stats.slice(0, 6).map((item) => ({ name: item.appName.slice(0, 3), horas: Number((item.duration / 60).toFixed(1)) }));
  const appUsageData = stats.length > 0 ? stats.map((item) => ({ name: item.appName, value: item.duration, color: item.color })) : [{ name: 'Sem dados', value: 1, color: '#6B7280' }];

  useEffect(() => {
    const fetchSystemData = async () => {
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const [uptimeSec, processes] = await Promise.all([
          (window as any).electronAPI.systemUptime(),
          (window as any).electronAPI.processList(),
        ]);
        setUpTime(uptimeSec);
        setProcessCount(processes.length);
      }
    };
    
    fetchSystemData();
    
    // Update every 10 seconds
    const interval = setInterval(fetchSystemData, 10000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 overflow-y-auto h-[calc(100vh-80px)] fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-textPrimary">Estatísticas</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setPeriod('weekly')}
            className={`px-5 py-2 rounded-xl transition-all ${
              period === 'weekly' ? 'bg-primary text-white' : 'glass hover:bg-cardHover text-textSecondary'
            }`}
          >
            Semanal
          </button>
          <button
            onClick={() => setPeriod('monthly')}
            className={`px-5 py-2 rounded-xl transition-all ${
              period === 'monthly' ? 'bg-primary text-white' : 'glass hover:bg-cardHover text-textSecondary'
            }`}
          >
            Mensal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-blue-500/20">
              <Clock size={24} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-textSecondary">Horas Hoje</p>
              <h3 className="text-2xl font-bold text-textPrimary">{formatUptime(uptime % 86400)}</h3>
            </div>
          </div>
          <p className="text-sm text-textSecondary">Tempo acumulado nos apps monitorados</p>
        </div>

        <div className="glass rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-purple-500/20">
              <Monitor size={24} className="text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-textSecondary">Uso do PC</p>
              <h3 className="text-2xl font-bold text-textPrimary">{formatUptime(uptime)}</h3>
            </div>
          </div>
          <p className="text-sm text-textSecondary">Desde o último boot</p>
        </div>

        <div className="glass rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-green-500/20">
              <Terminal size={24} className="text-green-400" />
            </div>
            <div>
              <p className="text-sm text-textSecondary">Processos</p>
              <h3 className="text-2xl font-bold text-textPrimary">{processCount}</h3>
            </div>
          </div>
          <p className="text-sm text-textSecondary">No sistema</p>
        </div>

        <div className="glass rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-orange-500/20">
              <Calendar size={24} className="text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-textSecondary">Esta Semana</p>
              <h3 className="text-2xl font-bold text-textPrimary">{Math.floor(totalMinutes / 60)}h</h3>
            </div>
          </div>
          <p className="text-sm text-textSecondary">Baseado no uso salvo no app</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-textPrimary mb-6">{period === 'weekly' ? 'Horas por Dia' : 'Horas por Mês'}</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={period === 'weekly' ? weeklyData : monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '12px' }}
                  itemStyle={{ color: '#FFFFFF' }}
                />
                <Bar dataKey="horas" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-textPrimary mb-6">Uso por Aplicativo</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={appUsageData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {appUsageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '12px' }}
                  itemStyle={{ color: '#FFFFFF' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-8 glass rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-textPrimary mb-6">Atividade Recente</h2>
        <div className="space-y-4">
          {history.slice(0, 6).map((activity) => (
            <div key={activity.id} className="flex items-center justify-between p-4 rounded-xl bg-cardHover">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${
                  activity.type === 'shortcut' ? 'bg-cyan-500/20' :
                  activity.type === 'music' ? 'bg-green-500/20' :
                  activity.type === 'link' ? 'bg-purple-500/20' : 'bg-blue-500/20'
                }`}>
                  {activity.type === 'shortcut' ? <Terminal size={18} className="text-cyan-400" /> :
                   activity.type === 'music' ? <BarChart3 size={18} className="text-green-400" /> :
                   activity.type === 'link' ? <Globe size={18} className="text-purple-400" /> :
                   <Calendar size={18} className="text-blue-400" />}
                </div>
                <div>
                  <h4 className="font-semibold text-textPrimary">{activity.title}</h4>
                  <p className="text-sm text-textSecondary">{activity.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-textPrimary">{activity.type}</p>
                <p className="text-xs text-textSecondary">{activity.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
