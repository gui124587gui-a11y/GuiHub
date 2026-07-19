
import React, { useState, useEffect } from 'react';
import { Search, Star, ExternalLink, FolderOpen, Gamepad2, Terminal, Play, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface App {
  id: string;
  name: string;
  path: string;
  type: 'app' | 'url';
}

export default function Biblioteca() {
  const [apps, setApps] = useState<App[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const { favorites, addFavorite, deleteFavorite, addHistoryItem } = useAppStore();

  useEffect(() => {
    const fetchApps = async () => {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const installedApps = await window.electronAPI.getInstalledApps();
        setApps(installedApps);
      }
      setIsLoading(false);
    };
    
    fetchApps();
  }, []);

  const isFavorite = (app: App) => {
    return favorites.some(fav => fav.path === app.path);
  };

  const toggleFavorite = (e: React.MouseEvent, app: App) => {
    e.stopPropagation();
    const existingFav = favorites.find(fav => fav.path === app.path);
    if (existingFav) {
      deleteFavorite(existingFav.id);
    } else {
      addFavorite({
        type: app.type === 'url' ? 'website' : 'program',
        name: app.name,
        path: app.path,
        url: app.type === 'url' ? app.path : undefined,
      });
    }
  };

  const filteredApps = apps.filter(app => 
    app.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const launchApp = async (app: App) => {
    if (launchingId) return;
    setLaunchingId(app.id);
    
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        await window.electronAPI.launchApp(app);
        addHistoryItem({
          type: app.type === 'url' ? 'link' : 'app',
          title: app.name,
          description: `Aberto ${app.type === 'url' ? 'site' : 'aplicativo'}`,
        });
      }
    } catch (err) {
      console.error('Erro ao abrir app:', err);
    } finally {
      setLaunchingId(null);
    }
  };

  return (
    <div className="p-8 overflow-y-auto h-[calc(100vh-80px)] fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-textPrimary">Biblioteca de Apps</h1>
        <div className="relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-textSecondary" />
          <input
            type="text"
            placeholder="Buscar aplicativos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 pr-4 py-3 glass rounded-xl text-textPrimary placeholder-textSecondary w-80 focus:outline-none"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 glass rounded-3xl">
          <div className="w-32 h-32 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse">
            <FolderOpen size={64} className="text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-textPrimary mb-4">Detectando Aplicativos...</h2>
          <p className="text-textSecondary mb-8 max-w-md mx-auto">
            O GuiHub está procurando por aplicativos instalados no seu computador
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredApps.map((app) => (
            <div 
              key={app.id} 
              className="glass rounded-2xl p-6 hover:scale-[1.05] transition-all cursor-pointer group relative"
              onClick={() => launchApp(app)}
            >
              <button
                onClick={(e) => toggleFavorite(e, app)}
                className={`absolute top-3 right-3 p-1.5 rounded-lg transition-all ${
                  isFavorite(app) 
                    ? 'text-yellow-400 bg-yellow-400/10' 
                    : 'text-textSecondary/50 hover:text-textSecondary hover:bg-card'
                }`}
              >
                <Star size={18} fill={isFavorite(app) ? 'currentColor' : 'none'} />
              </button>
              
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-all">
                {app.type === 'url' ? <ExternalLink size={32} className="text-primary" /> : <Gamepad2 size={32} className="text-primary" />}
              </div>
              <h3 className="text-textPrimary font-semibold text-center truncate">{app.name}</h3>
              <div className="mt-3">
                <button className="w-full py-2 bg-primary/10 hover:bg-primary/20 rounded-lg text-primary text-sm font-medium flex items-center justify-center gap-2">
                  {launchingId === app.id ? (
                    <CheckCircle2 size={14} className="animate-pulse" />
                  ) : (
                    <Play size={14} />
                  )}
                  {launchingId === app.id ? 'Abrindo...' : 'Abrir'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
