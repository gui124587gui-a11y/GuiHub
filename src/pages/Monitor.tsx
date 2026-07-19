import React from 'react';
import { Activity, Cpu, HardDrive, MemoryStick, Monitor as MonitorIcon, Wifi } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { useHardware } from '@/hooks/useHardware';

export default function Monitor() {
  const { hardware, isLoading } = useHardware();

  const chartData = (values: number[]) => values.map((value, index) => ({ index, value }));

  const MetricCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    color,
    history = [],
  }: {
    title: string;
    value: string;
    subtitle: string;
    icon: any;
    color: string;
    history?: number[];
  }) => (
    <div className="glass rounded-3xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl" style={{ backgroundColor: `${color}20` }}>
            <Icon size={22} style={{ color }} />
          </div>
          <div>
            <p className="text-sm text-textSecondary">{title}</p>
            <p className="text-2xl font-bold text-textPrimary">{value}</p>
          </div>
        </div>
      </div>
      <p className="text-sm text-textSecondary mb-4">{subtitle}</p>
      {history.length > 0 && (
        <div className="h-16">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData(history)}>
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-8 h-[calc(100vh-80px)] overflow-y-auto fade-in">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
          <Activity size={34} className="text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-textPrimary">Monitor do PC</h1>
          <p className="text-textSecondary">Leitura em tempo real do hardware principal</p>
        </div>
      </div>

      {isLoading ? (
        <div className="glass rounded-3xl p-8 text-center text-textSecondary">Carregando hardware...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <MetricCard
            title="CPU"
            value={`${hardware.cpu ?? '--'}%`}
            subtitle={hardware.cpuModel ?? '--'}
            icon={Cpu}
            color="#3B82F6"
            history={hardware.cpuHistory}
          />
          <MetricCard
            title="RAM"
            value={`${hardware.ram ?? '--'}%`}
            subtitle={`${hardware.ramUsed ?? '--'} / ${hardware.ramTotal ?? '--'} GB`}
            icon={MemoryStick}
            color="#8B5CF6"
            history={hardware.ramHistory}
          />
          <MetricCard
            title="GPU"
            value={`${hardware.gpu ?? '--'}%`}
            subtitle={hardware.gpuModel ?? '--'}
            icon={MonitorIcon}
            color="#22C55E"
          />
          <MetricCard
            title="SSD"
            value={`${hardware.ssd ?? '--'}%`}
            subtitle={`${hardware.ssdUsed ?? '--'} / ${hardware.ssdTotal ?? '--'} GB usados`}
            icon={HardDrive}
            color="#F59E0B"
          />
          <MetricCard
            title="Rede"
            value={`${hardware.internetMbs ?? '--'} MB/s`}
            subtitle={`↑ ${hardware.netUpMbs ?? '--'} MB/s | ↓ ${hardware.netDownMbs ?? '--'} MB/s`}
            icon={Wifi}
            color="#06B6D4"
          />
        </div>
      )}
    </div>
  );
}
