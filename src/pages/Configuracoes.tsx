import React, { useEffect, useState } from 'react';
import { Settings, User, Sun, Moon, Bell, Globe, Monitor, Keyboard, RefreshCw, Info, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export default function Configuracoes() {
  const { theme, toggleTheme, userProfile, updateUserProfile, appMetadata, updateAppMetadata, addHistoryItem } = useAppStore();
  const [activeTab, setActiveTab] = useState('conta');
  const [nameInput, setNameInput] = useState(userProfile.name);
  const [emailInput, setEmailInput] = useState(userProfile.email);
  const [copyrightInput, setCopyrightInput] = useState(appMetadata.copyrightYear);
  const [descriptionInput, setDescriptionInput] = useState(appMetadata.description);
  const [updateStatus, setUpdateStatus] = useState('idle');
  const [updateMessage, setUpdateMessage] = useState('');
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [autoDownload, setAutoDownload] = useState(false);

  useEffect(() => {
    const loadPrefs = async () => {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.getUpdatePreferences) {
        const result = await (window as any).electronAPI.getUpdatePreferences();
        if (result?.ok && result?.prefs) {
          setAutoDownload(result.prefs.autoDownload ?? false);
        }
      }
    };

    loadPrefs();

    if (typeof window !== 'undefined' && (window as any).electronAPI?.onUpdateMessage) {
      (window as any).electronAPI.onUpdateMessage((status: any) => {
        setUpdateStatus(status.status);

        switch (status.status) {
          case 'checking':
            setUpdateMessage('Verificando atualizações...');
            setDownloadProgress(null);
            setUpdateReady(false);
            break;
          case 'update-available':
            setUpdateMessage('Nova versão encontrada! Deseja baixar agora?');
            setDownloadProgress(null);
            setUpdateReady(false);
            break;
          case 'update-not-available':
            setUpdateMessage('Nenhuma atualização disponível.');
            setDownloadProgress(null);
            setUpdateReady(false);
            break;
          case 'download-started':
            setUpdateMessage('Download iniciado...');
            setDownloadProgress(0);
            setUpdateReady(false);
            break;
          case 'download-progress':
            setUpdateMessage(`Baixando atualização: ${Math.round(status.progress)}%`);
            setDownloadProgress(Math.round(status.progress));
            break;
          case 'update-downloaded':
            setUpdateMessage('Atualização baixada! Pronto para instalar e reiniciar.');
            setDownloadProgress(100);
            setUpdateReady(true);
            break;
          case 'error':
            setUpdateMessage(`Erro: ${status.error || 'Falha ao verificar atualização.'}`);
            setDownloadProgress(null);
            setUpdateReady(false);
            break;
          default:
            break;
        }
      });
    }
  }, []);

  const handleToggleAutoDownload = async () => {
    const newValue = !autoDownload;
    setAutoDownload(newValue);
    if (typeof window !== 'undefined' && (window as any).electronAPI?.setUpdatePreferences) {
      await (window as any).electronAPI.setUpdatePreferences({ autoDownload: newValue });
    }
  };

  const handleCheckForUpdates = async () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.checkForUpdates) {
      setUpdateStatus('checking');
      setUpdateMessage('Verificando atualizações...');
      const res = await (window as any).electronAPI.checkForUpdates();
      if (!res?.ok) {
        setUpdateStatus('error');
        setUpdateMessage(`Erro ao verificar atualizações: ${res?.error ?? 'desconhecido'}`);
      }
    }
  };

  const handleDownloadUpdate = async () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.downloadUpdate) {
      setUpdateStatus('download-started');
      setUpdateMessage('Iniciando download...');
      const res = await (window as any).electronAPI.downloadUpdate();
      if (!res?.ok) {
        setUpdateStatus('error');
        setUpdateMessage(`Erro ao iniciar download: ${res?.error ?? 'desconhecido'}`);
      }
    }
  };

  const handleInstallUpdate = async () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.installUpdate) {
      await (window as any).electronAPI.installUpdate();
    }
  };

  const handleClearStore = async () => {
    if (window.confirm('Tem certeza que quer limpar todos os dados? Isso resetará tudo!')) {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.clearStoreData) {
        await (window as any).electronAPI.clearStoreData();
        window.location.reload();
      }
    }
  };

  const tabs = [
    { id: 'conta', label: 'Conta', icon: User },
    { id: 'tema', label: 'Tema', icon: Monitor },
    { id: 'notificacoes', label: 'Notificações', icon: Bell },
    { id: 'idioma', label: 'Idioma', icon: Globe },
    { id: 'atalhos', label: 'Atalhos', icon: Keyboard },
    { id: 'atualizacoes', label: 'Atualizações', icon: RefreshCw },
    { id: 'sobre', label: 'Sobre', icon: Info },
  ];

  return (
    <div className="p-8 overflow-y-auto h-[calc(100vh-80px)] fade-in">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-textPrimary mb-8 flex items-center gap-3">
          <Settings size={32} />
          Configurações
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="glass rounded-2xl p-2 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      activeTab === tab.id
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'text-textSecondary hover:bg-cardHover hover:text-textPrimary'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="glass rounded-2xl p-8">
              {activeTab === 'conta' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-textPrimary mb-6">Conta</h2>
              <div className="flex items-center gap-6 mb-8">
                <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center"
                  style={{ 
                    background: `linear-gradient(135deg, ${userProfile.avatarColor}, #8B5CF6)` 
                  }}
                >
                  <span className="text-3xl font-bold text-white">
                    {userProfile.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-textPrimary">{userProfile.name}</h3>
                  <p className="text-textSecondary">{userProfile.email}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-2">Nome</label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl glass text-textPrimary focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-2">E-mail</label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl glass text-textPrimary focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>
              <button 
                onClick={() => {
                  updateUserProfile({ name: nameInput, email: emailInput });
                  addHistoryItem({
                    type: 'note',
                    title: 'Perfil',
                    description: 'Atualizou perfil do usuário',
                  });
                }}
                className="mt-6 px-6 py-3 bg-primary hover:bg-primary/90 rounded-xl transition-all text-white font-medium"
              >
                Salvar Alterações
              </button>
            </div>
          )}

              {activeTab === 'tema' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-textPrimary mb-6">Tema</h2>
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <button
                      onClick={() => theme !== 'dark' && toggleTheme()}
                      className={`p-6 rounded-2xl border-2 transition-all ${
                        theme === 'dark'
                          ? 'border-primary bg-primary/10'
                          : 'border-transparent hover:border-primary/30'
                      }`}
                    >
                      <div className="w-full h-24 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl mb-3 flex items-center justify-center">
                        <Moon size={32} className="text-primary" />
                      </div>
                      <p className="font-medium text-textPrimary">Escuro</p>
                    </button>
                    <button
                      onClick={() => theme !== 'light' && toggleTheme()}
                      className={`p-6 rounded-2xl border-2 transition-all ${
                        theme === 'light'
                          ? 'border-primary bg-primary/10'
                          : 'border-transparent hover:border-primary/30'
                      }`}
                    >
                      <div className="w-full h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl mb-3 flex items-center justify-center">
                        <Sun size={32} className="text-primary" />
                      </div>
                      <p className="font-medium text-textPrimary">Claro</p>
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-cardHover">
                      <div>
                        <p className="font-medium text-textPrimary">Efeito Glassmorphism</p>
                        <p className="text-sm text-textSecondary">Fundo transparente com desfoque</p>
                      </div>
                      <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-all"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-cardHover">
                      <div>
                        <p className="font-medium text-textPrimary">Animações</p>
                        <p className="text-sm text-textSecondary">Transições suaves entre telas</p>
                      </div>
                      <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-all"></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-8 border-t border-cardHover mt-8">
                    <h3 className="text-lg font-semibold text-textPrimary mb-4">Danger Zone</h3>
                    <button
                      onClick={handleClearStore}
                      className="w-full py-3 px-6 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={18} />
                      Limpar Todos os Dados e Resetar
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'notificacoes' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-textPrimary mb-6">Notificações</h2>
                  <div className="space-y-4">
                    {[
                      { title: 'Notificações do Sistema', desc: 'Alertas sobre atualizações e manutenção' },
                      { title: 'Lembretes de Agenda', desc: 'Notificações sobre eventos próximos' },
                      { title: 'Backup Concluído', desc: 'Aviso quando backups forem finalizados' },
                      { title: 'Notificações Sonoras', desc: 'Tocar som ao receber notificações' },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-cardHover">
                        <div>
                          <p className="font-medium text-textPrimary">{item.title}</p>
                          <p className="text-sm text-textSecondary">{item.desc}</p>
                        </div>
                        <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer">
                          <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-all"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'idioma' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-textPrimary mb-6">Idioma</h2>
                  <div className="space-y-3">
                    {['Português (Brasil)', 'English (US)', 'Español', 'Français', 'Deutsch'].map((lang, index) => (
                      <button
                        key={index}
                        className={`w-full text-left p-4 rounded-xl transition-all ${
                          index === 0 ? 'bg-primary/20 border border-primary/30' : 'bg-cardHover hover:bg-primary/10'
                        }`}
                      >
                        <p className="font-medium text-textPrimary">{lang}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'atalhos' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-textPrimary mb-6">Atalhos de Teclado</h2>
                  <div className="space-y-4">
                    {[
                      { action: 'Abrir Pesquisa Global', shortcut: 'Ctrl + K' },
                      { action: 'Abrir Command Palette', shortcut: 'Ctrl + P' },
                      { action: 'Alternar Tema', shortcut: 'Ctrl + T' },
                      { action: 'Novo Workspace', shortcut: 'Ctrl + N' },
                      { action: 'Nova Nota', shortcut: 'Ctrl + Shift + N' },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-cardHover">
                        <p className="font-medium text-textPrimary">{item.action}</p>
                        <kbd className="px-4 py-2 rounded-lg bg-primary/20 text-primary font-mono text-sm">{item.shortcut}</kbd>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'atualizacoes' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-textPrimary mb-6">Atualizações</h2>
                  <div className="space-y-6">
                    <div className="flex flex-col gap-4 p-6 rounded-3xl bg-cardHover">
                      <div className="flex flex-col gap-2">
                        <p className="font-medium text-textPrimary">Atualizações via GitHub Releases</p>
                        <p className="text-sm text-textSecondary">
                          O app verifica e baixa atualizações quando disponível. Você pode controlar se o download deve ser automático.
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <button
                          className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 transition-all"
                          onClick={handleCheckForUpdates}
                        >
                          Verificar Atualizações
                        </button>
                        <label className="flex items-center gap-3 text-textSecondary">
                          <input
                            type="checkbox"
                            checked={autoDownload}
                            onChange={handleToggleAutoDownload}
                            className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                          />
                          Baixar automaticamente
                        </label>
                      </div>

                      <div className="rounded-2xl border border-primary/10 bg-slate-950/40 p-4">
                        <p className="text-sm text-textSecondary">Status da atualização</p>
                        <p className="mt-2 text-textPrimary font-medium">{updateMessage || 'Nenhuma ação iniciada.'}</p>
                        {downloadProgress !== null && (
                          <div className="mt-3 h-3 rounded-full bg-primary/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${downloadProgress}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {updateStatus === 'update-available' && !autoDownload && (
                        <div className="flex flex-wrap gap-3">
                          <button
                            className="px-4 py-2 rounded-xl bg-secondary text-white hover:bg-secondary/90 transition-all"
                            onClick={handleDownloadUpdate}
                          >
                            Baixar agora
                          </button>
                        </div>
                      )}

                      {updateReady && (
                        <div className="flex flex-wrap gap-3">
                          <button
                            className="px-4 py-2 rounded-xl bg-green-500 text-white hover:bg-green-500/90 transition-all"
                            onClick={handleInstallUpdate}
                          >
                            Instalar e Reiniciar
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="p-4 rounded-xl glass space-y-3">
                      <p className="text-textSecondary text-sm">
                        O auto-update oficial usa GitHub Releases. Configure seu repositório e defina o token
                        em `GH_TOKEN` para publicar novas versões automaticamente.
                      </p>
                      <button
                        className="px-4 py-2 rounded-xl glass text-textPrimary border border-primary/20 hover:bg-cardHover transition-all"
                        onClick={() => {
                          const url = 'https://update-js.vercel.app/';
                          if (typeof window !== 'undefined' && (window as any).electronAPI?.openExternal) {
                            (window as any).electronAPI.openExternal(url);
                          } else {
                            window.open(url, '_blank');
                          }
                        }}
                      >
                        Abrir site de updates
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'sobre' && (
                <div className="space-y-6 text-center">
                  <div className="p-8">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
                      <span className="text-4xl font-bold text-white">GH</span>
                    </div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                      GuiHub
                    </h2>
                    <p className="text-textSecondary mb-6">Versão 1.0.0</p>
                    <p className="text-textSecondary mb-8 max-w-md mx-auto">
                      O centro de controle definitivo para produtividade, automação e monitoramento de hardware.
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center">
                      <a href="#" className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 transition-all text-white font-medium">
                        Site Oficial
                      </a>
                      <a href="#" className="px-6 py-3 rounded-xl glass hover:bg-cardHover transition-all text-textPrimary font-medium">
                        Documentação
                      </a>
                    </div>
                  </div>
                  <div className="pt-8 border-t border-primary/10">
                    <p className="text-sm text-textSecondary">
                      © {appMetadata.copyrightYear} GuiHub. Todos os direitos reservados.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
