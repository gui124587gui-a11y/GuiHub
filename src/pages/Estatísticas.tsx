import React from 'react';
import { BarChart3, Clock, Activity, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { useAppStore } from '@/store/useAppStore';

export default function Estatísticas() {
  const { stats } = useAppStore();

  const totalMinutes = stats.reduce((acc, item) => acc + item.duration, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  const chartData = stats.map(item => ({
    name: item.appName,
    horas: Number((item.duration / 60).toFixed(1)),
    color: item.color
  }));

  return (
    <div className="p-8 overflow-y-auto h-[calc(100vh-80px)] fade-in">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
          <BarChart3 size={32} className="text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-textPrimary">Estatísticas</h1>
          <p className="text-textSecondary">Uso de aplicativos e atividades</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass rounded-2xl p-6 hover:scale-[1.01] transition-all duration-300">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-blue-500/20">
              <Clock size={24} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-textSecondary">Total de Uso</p>
              <p className="text-2xl font-bold text-textPrimary">{totalHours}h {remainingMinutes}m</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 hover:scale-[1.01] transition-all duration-300">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-purple-500/20">
              <Activity size={24} className="text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-textSecondary">Apps Monitorados</p>
              <p className="text-2xl font-bold text-textPrimary">{stats.length}</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 hover:scale-[1.01] transition-all duration-300">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-green-500/20">
              <TrendingUp size={24} className="text-green-400" />
            </div>
            <div>
              <p className="text-sm text-textSecondary">App Mais Usado</p>
              <p className="text-xl font-bold text-textPrimary">
                {stats.length > 0 
                  ? (() => {
                      const sorted = [...stats].sort((a, b) => b.duration - a.duration);
                      return sorted[0].appName;
                    })()
                  : "Nenhum"
                }
              </p>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 hover:scale-[1.01] transition-all duration-300">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-orange-500/20">
              <BarChart3 size={24} className="text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-textSecondary">Média Diária</p>
              <p className="text-2xl font-bold text-textPrimary">
                {stats.length > 0 
                  ? `${Math.floor(totalMinutes / stats.length)}m`
                  : "0m"
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="glass rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-textPrimary mb-6">Uso por Aplicativo (horas)</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#111827', 
                  borderColor: '#374151',
                  borderRadius: '12px',
                  color: '#F3F4F6' 
                }} 
              />
              <Bar dataKey="horas" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* List */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-textPrimary mb-6">Detalhes</h2>
        <div className="space-y-4">
          {stats.map((stat) => (
            <div key={stat.id} className="flex items-center justify-between p-4 rounded-xl bg-cardHover">
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${stat.color}20` }}
                >
                  <div 
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: stat.color }}
                  />
                </div>
                <div>
                  <p className="font-semibold text-textPrimary">{stat.appName}</p>
                  <p className="text-xs text-textSecondary">Último uso: {stat.lastUsedAt}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-textPrimary">
                  {Math.floor(stat.duration / 60)}h {stat.duration % 60}m
                </p>
                <p className="text-xs text-textSecondary">
                  {((stat.duration / totalMinutes) * 100 || 0).toFixed(1)}% do total
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
