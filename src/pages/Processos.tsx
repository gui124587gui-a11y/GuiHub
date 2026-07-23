import { useCallback, useEffect, useState } from 'react';
import { Cpu, MemoryStick, RefreshCw, TriangleAlert } from 'lucide-react';

type Process = { pid: number; name: string; cpu: number; mem: number; memoryMb: number };
const formatMemory = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(0)} MB`;

export default function Processos() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI?.processList();
      setProcesses((data || []).sort((a, b) => (b.cpu + b.mem) - (a.cpu + a.mem)));
      setUpdatedAt(new Date());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); const interval = window.setInterval(refresh, 5000); return () => window.clearInterval(interval); }, [refresh]);

  return <div className="h-[calc(100vh-80px)] overflow-y-auto p-6 fade-in">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4"><div className="rounded-2xl bg-primary/15 p-3 text-primary"><TriangleAlert size={28} /></div><div><h1 className="text-2xl font-bold text-white">Processos pesados</h1><p className="text-sm text-textSecondary">Identifique rapidamente o que está deixando o computador lento.</p></div></div>
      <button onClick={() => void refresh()} disabled={loading} className="flex items-center gap-2 rounded-xl border border-primary/50 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-white disabled:opacity-50"><RefreshCw size={17} className={loading ? 'animate-spin' : ''} /> Atualizar</button>
    </div>
    <div className="mb-4 flex items-center justify-between text-xs text-textSecondary"><span>Atualização automática a cada 5 segundos</span><span>{updatedAt ? `Atualizado às ${updatedAt.toLocaleTimeString()}` : 'Carregando...'}</span></div>
    <div className="overflow-hidden rounded-2xl border border-primary/30 bg-card">
      <div className="grid grid-cols-[minmax(0,1fr)_90px_120px] gap-3 border-b border-primary/25 bg-black px-5 py-3 text-xs font-bold uppercase tracking-wider text-textSecondary"><span>Processo</span><span>CPU</span><span>Memória</span></div>
      {processes.map((process) => <div key={`${process.pid}-${process.name}`} className="grid grid-cols-[minmax(0,1fr)_90px_120px] gap-3 border-b border-white/5 px-5 py-3 last:border-0 hover:bg-primary/10"><div className="min-w-0"><p className="truncate font-semibold text-white">{process.name}</p><p className="text-xs text-textSecondary">PID {process.pid}</p></div><span className="flex items-center gap-1 font-semibold text-primary"><Cpu size={15} />{process.cpu.toFixed(1)}%</span><span className="flex items-center gap-1 font-semibold text-white"><MemoryStick size={15} className="text-primary" />{formatMemory(process.memoryMb)}</span></div>)}
      {!loading && processes.length === 0 && <p className="p-8 text-center text-textSecondary">Não foi possível obter processos agora.</p>}
    </div>
  </div>;
}
