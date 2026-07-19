import React, { useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import Home from '@/pages/Home';
import Workspaces from '@/pages/Workspaces';
import Atalhos from '@/pages/Atalhos';
import Biblioteca from '@/pages/Biblioteca';
import Monitor from '@/pages/Monitor';
import Favoritos from '@/pages/Favoritos';
import Pesquisa from '@/pages/Pesquisa';
import Backup from '@/pages/Backup';
import Notas from '@/pages/Notas';
import Agenda from '@/pages/Agenda';
import Links from '@/pages/Links';
import Estatisticas from '@/pages/Estatisticas';
import Musica from '@/pages/Musica';
import Historico from '@/pages/Historico';
import Configuracoes from '@/pages/Configuracoes';
import InstallerMagic from '@/pages/InstallerMagic';
import { useAppStore } from '@/store/useAppStore';

export default function App() {
  const { activePage, theme } = useAppStore();

  useEffect(() => {
    document.body.classList.toggle('light', theme === 'light');
  }, [theme]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-hidden">
          {activePage === 'home' && <Home />}
          {activePage === 'workspaces' && <Workspaces />}
          {activePage === 'atalhos' && <Atalhos />}
          {activePage === 'biblioteca' && <Biblioteca />}
          {activePage === 'favoritos' && <Favoritos />}
          {activePage === 'pesquisa' && <Pesquisa />}
          {activePage === 'backup' && <Backup />}
          {activePage === 'monitor' && <Monitor />}
          {activePage === 'notas' && <Notas />}
          {activePage === 'agenda' && <Agenda />}
          {activePage === 'links' && <Links />}
          {activePage === 'estatisticas' && <Estatisticas />}
          {activePage === 'musica' && <Musica />}
          {activePage === 'historico' && <Historico />}
          {activePage === 'configuracoes' && <Configuracoes />}
          {activePage === 'installer' && <InstallerMagic />}
        </main>
      </div>
    </div>
  );
}
