import React from 'react';
import { Bell, Settings, Search, Minus, Square, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export default function Topbar() {
  const handleMinimize = () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.minimizeWindow();
    }
  };

  const handleMaximize = () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.maximizeWindow();
    }
  };

  const { searchQuery, setSearchQuery, setActivePage } = useAppStore();

  const handleClose = () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.closeWindow();
    }
  };

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    setActivePage('pesquisa');
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      setActivePage('pesquisa');
    }
    if (event.ctrlKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      setActivePage('pesquisa');
    }
  };

  return (
    <div className="h-20 glass border-b border-primary/10 flex items-center justify-between px-4" style={{ WebkitAppRegion: "drag" } as any}>

      <div className="flex-1 max-w-2xl mx-4">
        <div className="relative" style={{ WebkitAppRegion: "no-drag" } as any}>
          <input
            type="text"
            placeholder="Pesquisar (Ctrl + K)"
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-card/50 border border-primary/10 text-textPrimary placeholder-textSecondary focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-textSecondary">
            <Search size={20} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4" style={{ WebkitAppRegion: "no-drag" } as any}>
        <button onClick={() => setActivePage('notificacoes')} className="relative p-3 rounded-xl hover:bg-cardHover transition-all">
          <Bell size={20} className="text-textSecondary hover:text-textPrimary" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></span>
        </button>
        <button onClick={() => setActivePage('configuracoes')} className="p-3 rounded-xl hover:bg-cardHover transition-all">
          <Settings size={20} className="text-textSecondary hover:text-textPrimary" />
        </button>
        
        {/* Window Controls */}
        <div className="flex items-center gap-2 ml-4">
          <button 
            onClick={handleMinimize} 
            className="p-2 rounded-lg hover:bg-primary/20 text-textSecondary hover:text-primary transition-all"
          >
            <Minus size={18} />
          </button>
          <button 
            onClick={handleMaximize} 
            className="p-2 rounded-lg hover:bg-primary/20 text-textSecondary hover:text-primary transition-all"
          >
            <Square size={18} />
          </button>
          <button 
            onClick={handleClose} 
            className="p-2 rounded-lg hover:bg-red-500/20 text-textSecondary hover:text-red-400 transition-all"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
