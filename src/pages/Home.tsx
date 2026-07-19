
import React from 'react';
import { 
  Cpu, 
  MemoryStick, 
  Monitor as MonitorIcon, 
  HardDrive, 
  Play, 
  Pause,
  Terminal, 
  Globe, 
  FileText, 
  Calendar, 
  Link, 
  Music,
  Layers,
  Zap,
  ChevronRight,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Edit2,
  Plus,
  BarChart3,
  LogIn
} from 'lucide-react';
import { useHardware } from '@/hooks/useHardware';
import { LineChart, Line, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useAppStore } from '@/store/useAppStore';
import { useSpotify } from '@/hooks/useSpotify';

const shortcutIconMap: Record<string, any> = {
  HardDrive,
  Terminal,
  Globe,
  Cpu,
};

const HardwareCard = ({ 
  icon: Icon, 
  label, 
  value, 
  subtitle, 
  color, 
  history,
  isLoading,
  suffix = '%'
}: { 
  icon: any, 
  label: string, 
  value: number | null, 
  subtitle: string, 
  color: string, 
  history?: number[],
  isLoading?: boolean,
  suffix?: string
}) => {
  const chartData = history?.map((val, i) => ({ name: i, value: val })) || [];

  return (
    <div className="h-full glass rounded-2xl p-3 hover:scale-[1.01] transition-all duration-300 border border-primary/5 flex flex-col">
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-xl ${color} shadow-lg`}>
          <Icon size={18} className="text-white" />
        </div>
        <div className="text-right">
          {isLoading ? (
            <div className="h-6 w-20 bg-card/50 rounded-lg animate-pulse"></div>
          ) : (
            <span className="text-xl font-bold text-textPrimary">{value ?? '--'}{suffix}</span>
          )}
        </div>
      </div>
      <h3 className="text-textSecondary text-sm font-semibold mb-0.5">{label}</h3>
      <p className="text-[10px] text-textSecondary/70 mb-2">{subtitle}</p>
      {!isLoading && history && history.length > 0 && (
        <div className="mt-auto h-8">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={color.includes('blue') ? '#3B82F6' : color.includes('purple') ? '#8B5CF6' : color.includes('green') ? '#22C55E' : color.includes('orange') ? '#F59E0B' : '#06B6D4'} 
                strokeWidth={2} 
                dot={false} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

const Widget = ({ title, children, icon: Icon, rightButton }: { title: string, children: React.ReactNode, icon?: any, rightButton?: React.ReactNode }) => (
  <div className="h-full glass rounded-2xl p-4 border border-primary/5 flex flex-col">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={16} className="text-primary" />}
        <h3 className="text-sm font-bold text-textPrimary">{title}</h3>
      </div>
      {rightButton}
    </div>
    <div className="flex-1 overflow-hidden">
      {children}
    </div>
  </div>
);

export default function Home() {
  const { hardware, isLoading } = useHardware();
  const { workspaces, shortcuts, notes, agenda, links, stats, addHistoryItem, setActivePage } = useAppStore();
  const { isConnected, currentTrack, isPlaying, progressMs, durationMs, togglePlay, nextTrack, previousTrack, handleLogin, formatTime } = useSpotify();
  
  const totalUsageMinutes = stats.reduce((acc, item) => acc + item.duration, 0);
  const totalUsageHours = Math.floor(totalUsageMinutes / 60);
  const totalUsageRestMinutes = totalUsageMinutes % 60;
  const weekData = stats.slice(0, 7).map((item) => ({
    name: item.appName.slice(0, 3),
    horas: Number((item.duration / 60).toFixed(1)),
  }));
  const quickNotes = notes.slice(0, 3);
  const upcomingEvents = [...agenda].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)).slice(0, 3);
  const topLinks = links.slice(0, 4);
  const topWorkspaces = workspaces.slice(0, 3);
  const topShortcuts = shortcuts.slice(0, 4);

  const openLink = async (name: string, url: string) => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.openExternal) {
      await (window as any).electronAPI.openExternal(url);
      addHistoryItem({
        type: 'link',
        title: name,
        description: `Abriu ${url}`,
      });
    }
  };

  const runWorkspace = async (ws: typeof workspaces[0]) => {
    if (!(window as any).electronAPI) return;

    try {
      const sortedItems = [...ws.items].sort((a, b) => (a.delay || 0) - (b.delay || 0));

      for (const item of sortedItems) {
        if (item.delay) {
          await new Promise((resolve) => setTimeout(resolve, item.delay));
        }

        if (item.type === 'url' && item.url) {
          await (window as any).electronAPI.openExternal(item.url);
        } else if (item.type === 'folder' && item.path) {
          await (window as any).electronAPI.openPath(item.path);
        } else if (item.type === 'command' && item.command) {
          await (window as any).electronAPI.executeCommand(item.command);
        } else if (item.path) {
          if (item.path.includes('://')) {
            await (window as any).electronAPI.openExternal(item.path);
          } else {
            await (window as any).electronAPI.executeCommand(`Start-Process "${item.path}"`);
          }
        }
      }

      addHistoryItem({
        type: 'workspace',
        title: ws.name,
        description: 'Executou o workspace',
      });
    } catch (error) {
      console.error('Erro ao executar workspace:', error);
    }
  };

  const handleRunShortcut = async (shortcut: typeof shortcuts[0]) => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.executeCommand) {
      try {
        await (window as any).electronAPI.executeCommand(shortcut.command);
        addHistoryItem({
          type: 'shortcut',
          title: shortcut.name,
          description: 'Executou um atalho do sistema',
        });
      } catch (error) {
        console.error('Erro ao executar atalho:', error);
      }
    }
  };
  
  return (
    <div className="p-4 overflow-y-auto h-[calc(100vh-80px)]">
      <h1 className="text-xl font-bold text-textPrimary mb-4">Início</h1>
      {/* Linha 1 - Hardware (compact header) */}
      <div className="mb-6">
        <div className="flex items-stretch gap-4">
          {[
            { key: 'cpu', icon: Cpu, label: 'CPU', value: hardware.cpu, subtitle: hardware.cpuModel, color: '#1F6FEB', history: hardware.cpuHistory },
            { key: 'ram', icon: MemoryStick, label: 'RAM', value: hardware.ram, subtitle: `${hardware.ramUsed ?? '--'} / ${hardware.ramTotal ?? '--'} GB`, color: '#8B5CF6', history: hardware.ramHistory },
            { key: 'gpu', icon: MonitorIcon, label: 'GPU', value: hardware.gpu, subtitle: hardware.gpuModel ?? '--', color: '#22C55E' },
            { key: 'ssd', icon: HardDrive, label: 'SSD', value: hardware.ssd, subtitle: `${hardware.ssdUsed ?? '--'} / ${hardware.ssdTotal ?? '--'} GB`, color: '#F59E0B' },
            { key: 'net', icon: Globe, label: 'Internet', value: hardware.internetMbs ?? '--', subtitle: 'Conectado', color: '#06B6D4' }
          ].map((m) => (
            <div key={m.key} className="glass rounded-2xl p-4 flex-1 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${m.color}20` }}>
                  {React.createElement(m.icon, { size: 18, style: { color: m.color } })}
                </div>
                <div>
                  <p className="text-sm text-textSecondary">{m.label}</p>
                  <p className="text-xl font-bold text-textPrimary">{m.value ?? '--'}{m.key !== 'net' ? '%' : ''}</p>
                  <p className="text-[11px] text-textSecondary mt-1">{m.subtitle}</p>
                </div>
              </div>
              {m.history && m.history.length > 0 ? (
                <div className="w-36 h-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={m.history.map((v:any,i:number)=>({x:i,y:v}))}>
                      <Line type="monotone" dataKey="y" stroke={m.color} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="w-36 h-12" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Linha 2 - Workspaces, Atalhos, Monitor */}
      <div className="grid grid-cols-12 gap-3 mb-3">
        <div className="col-span-4">
          <Widget 
            title="Workspaces" 
            icon={Layers}
            rightButton={<button onClick={() => setActivePage('workspaces')} className="text-[10px] text-textSecondary hover:text-textPrimary font-medium">Ver todos</button>}
          >
            <div className="space-y-2">
              {topWorkspaces.map((ws) => (
                <div key={ws.id} className="flex items-center justify-between p-3 rounded-xl bg-card/30 hover:bg-card/50 transition-all cursor-pointer group">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: ws.color + '30' }}>
                      <Layers size={14} style={{ color: ws.color }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-textPrimary text-xs">{ws.name}</p>
                      <p className="text-[10px] text-textSecondary mt-0.5">{ws.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 rounded-lg hover:bg-primary/20 text-primary"><Edit2 size={12} /></button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); runWorkspace(ws); }} 
                      className="p-1.5 rounded-lg bg-primary text-white hover:bg-primary/80 transition-colors"
                    >
                      <Play size={12} fill="currentColor" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={() => setActivePage('workspaces')}
              className="w-full mt-3 py-2 rounded-xl glass hover:bg-cardHover text-[10px] font-semibold text-textSecondary flex items-center justify-center gap-1"
            >
              <Plus size={14} />
              Novo Workspace
            </button>
          </Widget>
        </div>
        <div className="col-span-4">
          <Widget 
            title="Atalhos" 
            icon={Zap}
            rightButton={<button onClick={() => setActivePage('atalhos')} className="text-[10px] text-textSecondary hover:text-textPrimary font-medium">Ver todos</button>}
          >
            <div className="grid grid-cols-2 gap-2">
              {topShortcuts.map((shortcut) => (
                <div 
                  key={shortcut.id} 
                  onClick={() => handleRunShortcut(shortcut)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card/30 hover:bg-card/50 transition-all cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    {React.createElement(shortcutIconMap[shortcut.icon] || Terminal, { size: 16 })}
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-textPrimary text-xs">{shortcut.name}</p>
                    <p className="text-[10px] text-textSecondary mt-0.5">{shortcut.description}</p>
                  </div>
                </div>
              ))}
              <div 
                onClick={() => setActivePage('atalhos')}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-dashed border-primary/30 hover:bg-card/30 transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Plus size={16} />
                </div>
                <p className="text-[10px] font-medium text-textSecondary text-center">Novo Atalho</p>
              </div>
            </div>
          </Widget>
        </div>
        <div className="col-span-4">
          <Widget 
            title="Monitor do PC" 
            icon={Cpu}
            rightButton={<button onClick={() => setActivePage('monitor')} className="text-[10px] text-textSecondary hover:text-textPrimary font-medium">Abrir</button>}
          >
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="p-3 rounded-xl bg-card/30">
                  <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-textSecondary">CPU</span>
                  <span className="text-sm font-bold text-textPrimary">{hardware.cpu ?? '--'}%</span>
                </div>
                <div className="h-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hardware.cpuHistory.map((v, i) => ({ x: i, y: v }))}>
                      <Line type="monotone" dataKey="y" stroke="#3B82F6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-card/30">
                  <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-textSecondary">RAM</span>
                  <span className="text-sm font-bold text-textPrimary">{hardware.ram ?? '--'}%</span>
                </div>
                <div className="h-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hardware.ramHistory.map((v, i) => ({ x: i, y: v }))}>
                      <Line type="monotone" dataKey="y" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-xl bg-card/30 text-center">
                <p className="text-[9px] text-textSecondary mb-0.5">GPU</p>
                <p className="text-base font-bold text-green-400">{hardware.gpu ?? '--'}%</p>
                <p className="text-[9px] text-textSecondary mt-0.5">{hardware.gpuModel ?? '--'}</p>
              </div>
              <div className="p-2 rounded-xl bg-card/30 text-center">
                <p className="text-[9px] text-textSecondary mb-0.5">Disco</p>
                <p className="text-base font-bold text-orange-400">{hardware.ssd ?? '--'}%</p>
                <p className="text-[9px] text-textSecondary mt-0.5">{hardware.ssdUsed ?? '--'} / {hardware.ssdTotal ?? '--'} GB</p>
              </div>
              <div className="p-2 rounded-xl bg-card/30 text-center">
                <p className="text-[9px] text-textSecondary mb-0.5">Rede</p>
                <p className="text-base font-bold text-cyan-400">Conectado</p>
                <p className="text-[9px] text-textSecondary mt-0.5">↑ {hardware.netUpMbs ?? '--'} ↓ {hardware.netDownMbs ?? '--'} MB/s</p>
              </div>
            </div>
          </Widget>
        </div>
      </div>

      {/* Linha 3 - Notas, Agenda, Estatísticas */}
      <div className="grid grid-cols-12 gap-3 mb-3">
        <div className="col-span-4">
          <Widget 
            title="Notas rápidas" 
            icon={FileText}
            rightButton={<button onClick={() => setActivePage('notas')} className="text-[10px] text-textSecondary hover:text-textPrimary font-medium"><Plus size={12} /></button>}
          >
            <div className="space-y-2">
              {quickNotes.map((note) => (
                <div key={note.id} className="p-3 rounded-xl bg-card/30 border-l-4" style={{ borderColor: note.color }}>
                  <p className="font-semibold text-textPrimary text-xs">{note.title}</p>
                  <p className="text-[10px] text-textSecondary mt-0.5">{note.content || note.createdAt}</p>
                </div>
              ))}
            </div>
          </Widget>
        </div>
        <div className="col-span-4">
          <Widget 
            title="Agenda" 
            icon={Calendar}
            rightButton={<button onClick={() => setActivePage('agenda')} className="text-[10px] text-textSecondary hover:text-textPrimary font-medium">Ver todos</button>}
          >
            <div className="space-y-2">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ backgroundColor: event.color + '15', borderLeft: `3px solid ${event.color}` }}>
                  <div className="text-[10px] font-bold text-textPrimary">{event.time}</div>
                  <div className="text-xs text-textPrimary">{event.title}</div>
                </div>
              ))}
            </div>
          </Widget>
        </div>
        <div className="col-span-4">
          <Widget 
            title="Estatísticas" 
            icon={BarChart3}
            rightButton={<button onClick={() => setActivePage('estatisticas')} className="text-[10px] text-textSecondary hover:text-textPrimary font-medium">Ver todos</button>}
          >
            <div className="mb-3">
              <p className="text-xl font-bold text-textPrimary mb-1">{totalUsageHours}h {totalUsageRestMinutes}m</p>
              <p className="text-[10px] text-textSecondary">Tempo de uso hoje</p>
            </div>
            <div className="h-20 mb-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekData}>
                  <Bar dataKey="horas" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {stats.slice(0, 4).map((app) => (
                <div key={app.id} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: app.color }} />
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold text-textPrimary">{app.appName}</p>
                  </div>
                  <p className="text-[9px] text-textSecondary">{Math.floor(app.duration / 60)}h {app.duration % 60}m</p>
                </div>
              ))}
            </div>
          </Widget>
        </div>
      </div>

      {/* Linha 4 - Links e Música */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-5">
          <Widget 
            title="Links" 
            icon={Link}
            rightButton={<button onClick={() => setActivePage('links')} className="text-[10px] text-textSecondary hover:text-textPrimary font-medium">Ver todos</button>}
          >
            <div className="space-y-2">
              {topLinks.map((link) => (
                <button key={link.id} type="button" onClick={() => openLink(link.name, link.url)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-card/30 hover:bg-card/50 transition-all cursor-pointer text-left">
                  <div className="p-2 rounded-lg bg-primary/20 text-primary">
                    <Globe size={14} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-textPrimary">{link.name}</p>
                    <p className="text-[9px] text-textSecondary">{link.url.replace(/^https?:\/\//, '')}</p>
                  </div>
                </button>
              ))}
            </div>
            <button className="w-full mt-3 py-2 rounded-xl glass hover:bg-cardHover text-[10px] font-semibold text-textSecondary flex items-center justify-center gap-1">
              <ChevronRight size={12} />
              Adicionar link
            </button>
          </Widget>
        </div>
        <div className="col-span-7">
          <Widget 
            title="Música" 
            icon={Music}
            rightButton={<button onClick={() => setActivePage('musica')} className="text-[10px] text-textSecondary hover:text-textPrimary font-medium">Abrir player</button>}
          >
            {!isConnected ? (
              <div className="flex flex-col items-center justify-center h-full py-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-xl flex items-center justify-center mb-3">
                  <Music size={24} className="text-green-500" />
                </div>
                <h4 className="text-xs font-semibold text-textPrimary mb-2">Conectar ao Spotify</h4>
                <button
                  onClick={handleLogin}
                  className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg text-white text-[10px] font-semibold transition-all"
                >
                  <LogIn size={14} />
                  Conectar
                </button>
              </div>
            ) : currentTrack ? (
              <div className="flex items-center gap-4">
                <img
                  src={currentTrack.album.images[0]?.url}
                  alt={currentTrack.album.name}
                  className="w-20 h-20 rounded-xl shadow-lg"
                />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-textPrimary mb-1">{currentTrack.name}</h4>
                  <p className="text-xs text-textSecondary mb-2">{currentTrack.artists.map((a: any) => a.name).join(', ')}</p>
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-textSecondary">{formatTime(progressMs)}</span>
                      <span className="text-[9px] text-textSecondary">{formatTime(durationMs)}</span>
                    </div>
                    <div className="w-full h-1 bg-card rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all"
                        style={{ width: `${(progressMs / durationMs) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-1.5">
                    <button className="p-1 rounded-full text-textSecondary hover:text-textPrimary transition-all">
                      <Shuffle size={12} />
                    </button>
                    <button
                      onClick={previousTrack}
                      className="p-1.5 rounded-full text-textPrimary hover:bg-cardHover transition-all"
                    >
                      <SkipBack size={16} fill="currentColor" />
                    </button>
                    <button
                      onClick={togglePlay}
                      className="p-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all"
                    >
                      {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                    </button>
                    <button
                      onClick={nextTrack}
                      className="p-1.5 rounded-full text-textPrimary hover:bg-cardHover transition-all"
                    >
                      <SkipForward size={16} fill="currentColor" />
                    </button>
                    <button className="p-1 rounded-full text-textSecondary hover:text-textPrimary transition-all">
                      <Repeat size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Music size={24} className="text-green-500" />
                </div>
                <h4 className="text-xs font-semibold text-textPrimary mb-1">Nenhuma faixa reproduzindo</h4>
                <p className="text-[10px] text-textSecondary">Abra o Spotify e comece a tocar uma música!</p>
              </div>
            )}
          </Widget>
        </div>
      </div>
    </div>
  );
}
