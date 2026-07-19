import React from 'react';
import {
  Home,
  Layers,
  Zap,
  BookOpen,
  Star,
  Search,
  HardDrive,
  Activity,
  FileText,
  Calendar,
  Link,
  BarChart3,
  Music,
  Settings,
  Menu,
  ChevronLeft,
  Sun,
  Moon,
  History,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

const navItems = [
  { id: 'home', icon: Home, label: 'Início' },
  { id: 'workspaces', icon: Layers, label: 'Workspaces' },
  { id: 'atalhos', icon: Zap, label: 'Atalhos' },
  { id: 'biblioteca', icon: BookOpen, label: 'Biblioteca' },
  { id: 'favoritos', icon: Star, label: 'Favoritos' },
  { id: 'pesquisa', icon: Search, label: 'Pesquisa' },
  { id: 'backup', icon: HardDrive, label: 'Backup' },
  { id: 'monitor', icon: Activity, label: 'Monitor do PC' },
  { id: 'notas', icon: FileText, label: 'Notas' },
  { id: 'agenda', icon: Calendar, label: 'Agenda' },
  { id: 'links', icon: Link, label: 'Links' },
  { id: 'estatisticas', icon: BarChart3, label: 'Estatísticas' },
  { id: 'musica', icon: Music, label: 'Música' },
  { id: 'installer', icon: Sparkles, label: 'Instalador Mágico' },
  { id: 'historico', icon: History, label: 'Histórico' },
  { id: 'configuracoes', icon: Settings, label: 'Configurações' },
];

export default function Sidebar() {
  const { activePage, setActivePage, sidebarCollapsed, toggleSidebar, theme, toggleTheme } = useAppStore();

  return (
    <div className={cn(
      "h-screen glass border-r border-primary/10 flex flex-col transition-all duration-300",
      sidebarCollapsed ? "w-20" : "w-72"
    )}>
      {/* Logo and Hamburger */}
      <div className="p-4 border-b border-primary/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">G</span>
          </div>
          {!sidebarCollapsed && (
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                GuiHub
              </h1>
            </div>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-cardHover transition-colors"
        >
          {sidebarCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200",
              activePage === item.id
                ? "bg-primary/20 text-primary border border-primary/30"
                : "text-textSecondary hover:bg-cardHover hover:text-textPrimary"
            )}
            title={sidebarCollapsed ? item.label : undefined}
          >
            <item.icon size={20} />
            {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-3 border-t border-primary/10">
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-cardHover transition-all cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">G</span>
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-textPrimary">Gui</p>
              <p className="text-xs text-textSecondary">Bem-vindo de volta!</p>
            </div>
          )}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-cardHover transition-colors flex-shrink-0"
            title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
