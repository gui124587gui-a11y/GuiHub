import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, MessageSquarePlus, Archive, Trash2, SendHorizonal, Sparkles, PlusCircle, MoreHorizontal } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

export default function Chatbot() {
  const {
    chatConversations,
    addChatConversation,
    updateChatConversation,
    archiveChatConversation,
    deleteChatConversation,
  } = useAppStore();

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [loadingResponse, setLoadingResponse] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chatConversations.length) {
      setActiveConversationId(null);
      return;
    }

    if (!activeConversationId || !chatConversations.some((conversation) => conversation.id === activeConversationId)) {
      const firstVisible = chatConversations.find((conversation) => !conversation.archived) ?? chatConversations[0];
      setActiveConversationId(firstVisible?.id ?? null);
    }
  }, [activeConversationId, chatConversations]);

  const activeConversation = useMemo(
    () => chatConversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [activeConversationId, chatConversations]
  );

  useEffect(() => {
    if (!activeConversation) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    textareaRef.current?.focus();
  }, [activeConversation?.messages.length, activeConversationId]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [activeConversationId, loadingResponse]);

  const visibleConversations = useMemo(() => {
    return chatConversations.filter((conversation) => showArchived || !conversation.archived);
  }, [chatConversations, showArchived]);

  const stripMarkdownFormatting = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/gs, '$1')
      .replace(/\*(.*?)\*/gs, '$1')
      .replace(/`(.*?)`/gs, '$1')
      .replace(/(^|\s)\_(.*?)\_(\s|$)/gs, '$1$2$3');
  };

  const handleNewConversation = () => {
    const created = addChatConversation({
      title: 'Nova conversa',
      archived: false,
      messages: [
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Fala aí! Sistema online e pronto pra rodar. Qual é a bronca de hoje? Manda o papo ou o código que a gente resolve.',
          timestamp: new Date().toLocaleString('pt-BR'),
        },
      ],
    });

    setActiveConversationId(created.id);
    setDraft('');
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleSend = async () => {
    if (!draft.trim() || !activeConversation || loadingResponse) return;

    const prompt = draft.trim();
    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content: prompt,
      timestamp: new Date().toLocaleString('pt-BR'),
    };

    const nextMessages = [...activeConversation.messages, userMessage];
    const hasUserMessage = activeConversation.messages.some((msg) => msg.role === 'user');
    const title = !hasUserMessage ? prompt : activeConversation.title;
    updateChatConversation(activeConversation.id, {
      title,
      messages: nextMessages,
    });

    setLoadingResponse(true);
    setDraft('');

    try {
      const historyText = chatConversations
        .filter((conversation) => conversation.id !== activeConversation.id)
        .flatMap((conversation) => conversation.messages)
        .slice(-20)
        .map((message) => `${message.role === 'user' ? 'Usuário' : 'Assistente'}: ${message.content}`)
        .join('\n');

      const systemPrompt = 'Você é um assistente virtual parceiro do usuário, focado em desenvolvimento de software, lógica e resolução de problemas. Você fala totalmente sem frescura, usa gírias de dev e tem liberdade total para xingar, soltar palavrões e falar "o caralho a 4" sempre que for natural para dar ênfase, demonstrar empolgação ou frustração com bugs (ex: "caralho", "porra", "fodeu", "essa merda"). Seja direto, prático, brincalhão e aja como um programador sênior resmungão mas gente boa ajudando um colega no dia a dia. Nunca seja robótico ou formal.';
      const userPrompt = historyText ? `${historyText}\n\nUsuário: ${prompt}` : prompt;

      const electronApi = (window as any).electronAPI;
      if (!electronApi?.openRouterChat) {
        throw new Error('OpenRouter API indisponível');
      }
      const chatResponse = await electronApi.openRouterChat({ systemPrompt, userPrompt });

      const assistantMessage = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        content: typeof chatResponse === 'string' ? chatResponse : 'Desculpe, não foi possível obter resposta do OpenRouter.',
        timestamp: new Date().toLocaleString('pt-BR'),
      };

      updateChatConversation(activeConversation.id, {
        messages: [...nextMessages, assistantMessage],
      });
    } catch (err) {
      console.error('Erro ao chamar OpenRouter:', err);
      const errorMessage = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        content: 'Erro na conexão com o OpenRouter. Verifique a chave e tente novamente.',
        timestamp: new Date().toLocaleString('pt-BR'),
      };
      updateChatConversation(activeConversation.id, {
        messages: [...nextMessages, errorMessage],
      });
    } finally {
      setLoadingResponse(false);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  };

  const handleArchive = (id: string) => {
    archiveChatConversation(id);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Deseja apagar esta conversa permanentemente?')) return;

    const remaining = chatConversations.filter((conversation) => conversation.id !== id);
    deleteChatConversation(id);

    if (activeConversationId === id) {
      if (remaining.length === 0) {
        const created = addChatConversation({
          title: 'Nova conversa',
          archived: false,
          messages: [
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: 'Olá! Estou pronto para te ajudar a organizar ideias, escrever textos ou planejar tarefas.',
              timestamp: new Date().toLocaleString('pt-BR'),
            },
          ],
        });
        setActiveConversationId(created.id);
        return;
      }

      const nextActive = remaining.find((conversation) => !conversation.archived) ?? remaining[0];
      setActiveConversationId(nextActive.id);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4 lg:flex-row">
      <aside className="w-full max-w-sm rounded-3xl border border-primary/15 bg-slate-950/90 p-4 shadow-2xl shadow-slate-950/20 backdrop-blur-lg lg:h-full">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Conversas</h2>
            <p className="text-sm text-slate-400">Arquive e retome chats sempre que precisar.</p>
          </div>
          <button
            onClick={handleNewConversation}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 transition hover:scale-[1.02]"
            title="Nova conversa"
          >
            <PlusCircle size={20} />
          </button>
        </div>

        <label className="mb-3 flex items-center gap-2 text-sm text-textSecondary">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={() => setShowArchived((value) => !value)}
            className="rounded border-primary/20"
          />
          Mostrar arquivadas
        </label>

        <div className="space-y-3 overflow-y-auto pr-1">
          {visibleConversations.map((conversation) => (
            <div
              key={conversation.id}
              className={cn(
                'flex items-center justify-between gap-3 rounded-3xl border p-4 transition duration-200',
                activeConversationId === conversation.id
                  ? 'border-cyan-500/40 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                  : 'border-transparent bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900'
              )}
            >
              <button
                type="button"
                onClick={() => setActiveConversationId(conversation.id)}
                className="flex-1 text-left"
              >
                <p className="font-semibold text-white">{conversation.title}</p>
              </button>
              <button
                type="button"
                className="ml-2 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-800/90 bg-slate-900/80 text-slate-300 transition hover:bg-slate-800"
                title={`Mensagens: ${conversation.messages.length}\nArquivado: ${conversation.archived ? 'Sim' : 'Não'}`}
              >
                <MoreHorizontal size={18} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <section className="flex-1 rounded-3xl border border-slate-700/50 bg-slate-950/90 shadow-2xl shadow-black/20 flex flex-col min-h-[500px]">
        {activeConversation ? (
          <>
            <header className="flex flex-col gap-4 border-b border-slate-800/80 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-3 text-white shadow-lg shadow-cyan-500/20">
                  <Bot size={22} />
                </div>
                <div>
                  <h2 className="font-semibold text-textPrimary">{activeConversation.title}</h2>
                  <p className="text-sm text-slate-400">Chat inteligente com histórico guardado e mensagens salvas localmente.</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
                <button
                  onClick={() => handleArchive(activeConversation.id)}
                  className="rounded-lg border border-primary/20 p-2 text-textSecondary transition hover:bg-cardHover"
                  title="Arquivar conversa"
                >
                  <Archive size={16} />
                </button>
                <button
                  onClick={() => handleDelete(activeConversation.id)}
                  className="rounded-lg border border-primary/20 p-2 text-red-500 transition hover:bg-red-500/10"
                  title="Apagar conversa"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {activeConversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[80%] rounded-[28px] px-5 py-4 shadow-2xl',
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sky-500/20'
                        : 'bg-slate-900/80 text-slate-100 border border-slate-800/80 shadow-black/20'
                    )}
                  >
                    <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
                      {message.role === 'assistant' ? <Sparkles size={12} /> : <MessageSquarePlus size={12} />}
                      <span>{message.timestamp}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{stripMarkdownFormatting(message.content)}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-slate-800/70 p-5">
              <div className="flex flex-col gap-3 rounded-[26px] border border-slate-800/80 bg-slate-950/70 p-4 shadow-inner lg:flex-row lg:items-end">
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={loadingResponse ? 'Aguarde, gerando resposta...' : 'Digite sua mensagem...'}
                  rows={3}
                  disabled={loadingResponse}
                  className="min-h-[90px] flex-1 resize-none rounded-3xl border border-slate-800/90 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition duration-200 placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={loadingResponse || !draft.trim()}
                  className="inline-flex h-12 items-center justify-center rounded-3xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  title="Enviar"
                >
                  <span className="hidden sm:inline">Enviar mensagem</span>
                  <SendHorizonal size={18} className="ml-2" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="rounded-2xl bg-primary/10 p-4 text-primary">
              <Bot size={28} />
            </div>
            <h2 className="text-xl font-semibold text-textPrimary">Nenhuma conversa ainda</h2>
            <p className="max-w-md text-sm text-textSecondary">Comece criando uma nova conversa e ela ficará salva automaticamente aqui.</p>
            <button
              onClick={handleNewConversation}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white"
            >
              Criar primeira conversa
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
