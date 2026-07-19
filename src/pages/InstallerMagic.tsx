import React, { useState, useEffect, useRef } from 'react';
import { Download, CheckCircle, AlertCircle, Sparkles, Loader2, Send, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusUpdate {
  step: number;
  totalSteps: number;
  text: string;
  status: 'in-progress' | 'success' | 'error' | 'warning';
  progress?: number; // 0-100 for download step
  type?: 'prompt-sent' | 'ai-response';
  content?: any;
}

export default function InstallerMagic() {
  const [softwareName, setSoftwareName] = useState('');
  const [statusLogs, setStatusLogs] = useState<StatusUpdate[]>([]);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const statusEndRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(6);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Scroll to bottom of status log
  useEffect(() => {
    statusEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [statusLogs]);

  // Listen for status updates and manual install signal
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.installerOnStatus((newStatus: StatusUpdate) => {
        setStatusLogs((prev) => [...prev, newStatus]);
        setCurrentStep(newStatus.step);
        setTotalSteps(newStatus.totalSteps);
        if (newStatus.progress !== undefined) {
          setDownloadProgress(newStatus.progress);
        }
      });

      window.electronAPI.installerOnNeedsManual(() => {
        setShowManualModal(true);
      });
    }
  }, []);

  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!softwareName.trim() || isInstalling) return;

    setIsInstalling(true);
    setStatusLogs([]);
    setCurrentStep(0);
    setDownloadProgress(0);
    setShowManualModal(false);

    try {
      await window.electronAPI?.installerStart(softwareName.trim());
    } catch (err) {
      console.error('Install error:', err);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleManualConfirm = async () => {
    try {
      const confirmed = await window.electronAPI?.installerConfirmComplete();
      if (confirmed !== false) {
        setStatusLogs((prev) => [
          ...prev,
          {
            step: 6,
            totalSteps: 6,
            text: 'Instalação manual confirmada. O arquivo temporário foi limpo.',
            status: 'success'
          }
        ]);
      }
    } catch (err) {
      console.error('Manual confirm error:', err);
    } finally {
      setShowManualModal(false);
    }
  };

  // Calculate overall progress
  const overallProgress = Math.min(
    Math.round(((currentStep - 1 + (downloadProgress / 100)) / totalSteps) * 100),
    100
  );

  // Status icon mapping
  const getStatusIcon = (status: StatusUpdate['status'], type?: StatusUpdate['type']) => {
    if (type === 'prompt-sent') return <Send size={18} className="text-blue-400" />;
    if (type === 'ai-response') return <MessageSquare size={18} className="text-purple-400" />;
    
    switch (status) {
      case 'in-progress':
        return <Loader2 size={18} className="text-primary animate-spin" />;
      case 'success':
        return <CheckCircle size={18} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={18} className="text-red-500" />;
      case 'warning':
        return <AlertCircle size={18} className="text-yellow-500" />;
      default:
        return null;
    }
  };

  const renderLogContent = (log: StatusUpdate) => {
    if (log.type === 'prompt-sent' && log.content) {
      return (
        <div className="mt-2 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
          <p className="text-xs font-semibold text-blue-400 mb-2">Prompt Sistema:</p>
          <pre className="text-xs text-textSecondary whitespace-pre-wrap mb-2">{log.content.system}</pre>
          <p className="text-xs font-semibold text-blue-400 mb-2">Prompt Usuário:</p>
          <pre className="text-xs text-textPrimary whitespace-pre-wrap">{log.content.user}</pre>
        </div>
      );
    }
    if (log.type === 'ai-response' && log.content) {
      return (
        <div className="mt-2 p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
          <p className="text-xs font-semibold text-purple-400 mb-2">Resposta IA:</p>
          <pre className="text-xs text-textPrimary whitespace-pre-wrap">{typeof log.content === 'string' ? log.content : JSON.stringify(log.content, null, 2)}</pre>
        </div>
      );
    }
    return <span className="text-textPrimary">{log.text}</span>;
  };

  return (
    <div className="p-8 overflow-y-auto h-[calc(100vh-80px)] fade-in">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-primary to-purple-500/20">
              <Sparkles size={48} className="text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-textPrimary mb-2">Instalador Mágico</h1>
          <p className="text-textSecondary text-lg">Digite o nome do software e deixe o resto com a gente</p>
        </div>

        <div className="glass rounded-3xl p-8 mb-8">
          <form onSubmit={handleInstall} className="flex flex-col gap-6">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Ex: Google Chrome, Discord, VS Code..."
                value={softwareName}
                onChange={(e) => setSoftwareName(e.target.value)}
                disabled={isInstalling}
                className="flex-1 px-6 py-4 rounded-2xl bg-card/30 border border-primary/20 text-textPrimary placeholder-textSecondary focus:outline-none focus:border-primary transition-all"
              />
              <button
                type="submit"
                disabled={!softwareName.trim() || isInstalling}
                className="px-8 py-4 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl text-white font-semibold flex items-center gap-2 transition-all neon-glow"
              >
                <Download size={20} />
                {isInstalling ? 'Instalando...' : 'Instalar'}
              </button>
            </div>

            {/* Progress Bar */}
            {statusLogs.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-textSecondary">Progresso</span>
                  <span className="text-textPrimary font-semibold">{Math.max(0, overallProgress)}%</span>
                </div>
                <div className="h-3 bg-card/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-purple-600 transition-all duration-300"
                    style={{ width: `${Math.max(0, overallProgress)}%` }}
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Status Log */}
        {statusLogs.length > 0 && (
          <div className="glass rounded-3xl p-6">
            <h3 className="text-xl font-semibold text-textPrimary mb-4 flex items-center gap-2">
              <CheckCircle size={24} className="text-primary" />
              Log de Instalação
            </h3>
            <div className="bg-card/40 rounded-2xl p-4 max-h-[500px] overflow-y-auto">
              {statusLogs.map((log, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "flex items-start gap-3 mb-4 pl-2 border-l-2 last:mb-0",
                    log.type === 'prompt-sent' && "border-blue-500",
                    log.type === 'ai-response' && "border-purple-500",
                    !log.type && log.status === 'success' && "border-green-500",
                    !log.type && log.status === 'error' && "border-red-500",
                    !log.type && log.status === 'warning' && "border-yellow-500",
                    !log.type && log.status === 'in-progress' && "border-primary"
                  )}
                >
                  {getStatusIcon(log.status, log.type)}
                  <div className="flex-1">
                    {renderLogContent(log)}
                  </div>
                </div>
              ))}
              <div ref={statusEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Manual Install Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-3xl p-8 max-w-md w-full text-center">
            <div className="mb-6">
              <div className="mx-auto w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mb-4">
                <AlertCircle size={40} className="text-yellow-500" />
              </div>
              <h3 className="text-2xl font-bold text-textPrimary mb-2">Ação Necessária</h3>
              <p className="text-textSecondary">
                A instalação silenciosa não pôde ser concluída automaticamente. 
                O instalador foi aberto em uma janela separada — por favor, complete a instalação manualmente.
              </p>
            </div>
            <button
              onClick={handleManualConfirm}
              className="w-full py-3 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 rounded-xl text-white font-semibold transition-all neon-glow"
            >
              Confirmar instalação concluída
            </button>
          </div>
        </div>
      )}
    </div>
  );
}