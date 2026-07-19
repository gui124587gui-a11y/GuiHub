import React, { useEffect, useMemo, useState } from 'react';
import { Search, File, Folder, Terminal, Link, FileText } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface SearchResult {
  id: string;
  type: 'file' | 'folder' | 'program' | 'link' | 'note';
  name: string;
  path?: string;
  url?: string;
  description?: string;
}

export default function Pesquisa() {
  const { links, notes, workspaces, searchQuery, setSearchQuery } = useAppStore();
  const [query, setQuery] = useState(searchQuery);
  const [installedApps, setInstalledApps] = useState<SearchResult[]>([]);
  const [filesystemResults, setFilesystemResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const fetchApps = async () => {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.getInstalledApps) {
        const apps = await (window as any).electronAPI.getInstalledApps();
        setInstalledApps(apps.map((app: { name: string; path: string; type: 'app' | 'url' }) => ({
          id: `app-${app.path}`,
          type: 'program',
          name: app.name,
          path: app.path,
          description: app.type === 'url' ? 'Atalho de URL instalado no sistema' : 'Aplicativo detectado no Windows',
        })));
      }
    };

    void fetchApps();
  }, []);

  // Debounced filesystem search
  useEffect(() => {
    if (!query.trim()) {
      setFilesystemResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.searchFilesystem) {
        setIsSearching(true);
        const results = await (window as any).electronAPI.searchFilesystem(query);
        setFilesystemResults(results);
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const localResults = useMemo(() => {
    const source: SearchResult[] = [
      ...installedApps,
      ...links.map((item) => ({
        id: `link-${item.id}`,
        type: 'link' as const,
        name: item.name,
        url: item.url,
        description: item.category,
      })),
      ...notes.map((item) => ({
        id: `note-${item.id}`,
        type: 'note' as const,
        name: item.title,
        description: item.content,
      })),
      ...workspaces.map((item) => ({
        id: `workspace-${item.id}`,
        type: 'folder' as const,
        name: item.name,
        path: item.description,
        description: `${item.items.length} item(ns) no workspace`,
      })),
    ];

    if (!query.trim()) return [];

    return source.filter((item) =>
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.description?.toLowerCase().includes(query.toLowerCase()) ||
      item.path?.toLowerCase().includes(query.toLowerCase()) ||
      item.url?.toLowerCase().includes(query.toLowerCase())
    );
  }, [installedApps, links, notes, query, workspaces]);

  // Combine local and filesystem results
  const results = useMemo(() => {
    return [...localResults, ...filesystemResults];
  }, [localResults, filesystemResults]);

  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setQuery(value);
  };

  const openResult = async (result: SearchResult) => {
    if (typeof window === 'undefined' || !(window as any).electronAPI) return;

    if (result.url) {
      await (window as any).electronAPI.openExternal(result.url);
      return;
    }

    if (result.path) {
      if (result.type === 'program') {
        await (window as any).electronAPI.openPath(result.path);
      } else {
        await (window as any).electronAPI.openPath(result.path);
      }
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'file': return <File size={24} className="text-blue-400" />;
      case 'folder': return <Folder size={24} className="text-yellow-400" />;
      case 'program': return <Terminal size={24} className="text-green-400" />;
      case 'link': return <Link size={24} className="text-purple-400" />;
      case 'note': return <FileText size={24} className="text-orange-400" />;
      default: return <Search size={24} />;
    }
  };

  return (
    <div className="p-8 overflow-y-auto h-[calc(100vh-80px)] fade-in">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-textPrimary mb-8 text-center">Pesquisa Global</h1>

        <div className="relative mb-8">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-textSecondary">
            <Search size={24} />
          </div>
          <input
            type="text"
            placeholder="Pesquise arquivos, pastas, programas, links..."
            value={query}
            onChange={handleSearch}
            className="w-full pl-14 pr-6 py-5 rounded-2xl glass text-textPrimary placeholder-textSecondary focus:outline-none focus:border-primary/50 text-lg"
            autoFocus
          />
        </div>

        {isSearching && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-textSecondary">Pesquisando...</p>
          </div>
        )}

        {!isSearching && query && results.length === 0 && (
          <div className="text-center py-12">
            <p className="text-textSecondary text-lg">Nenhum resultado encontrado para "{query}"</p>
          </div>
        )}

        {!isSearching && results.length > 0 && (
          <div className="space-y-4">
            <p className="text-textSecondary text-sm mb-4">{results.length} resultados encontrados</p>
            {results.map((result) => (
              <div key={result.id} onClick={() => openResult(result)} className="glass rounded-2xl p-6 hover:scale-[1.01] transition-all duration-200 cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-cardHover">
                    {getIcon(result.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-textPrimary">{result.name}</h3>
                    {result.path && <p className="text-sm text-textSecondary mt-1">{result.path}</p>}
                    {result.url && <p className="text-sm text-textSecondary mt-1">{result.url}</p>}
                    {result.description && <p className="text-sm text-textSecondary mt-2">{result.description}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isSearching && !query && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="glass rounded-2xl p-6 text-center">
              <File size={40} className="mx-auto mb-4 text-blue-400" />
              <h3 className="text-lg font-semibold text-textPrimary">Arquivos</h3>
              <p className="text-textSecondary mt-2">Pesquise por arquivos em seu computador</p>
            </div>
            <div className="glass rounded-2xl p-6 text-center">
              <Folder size={40} className="mx-auto mb-4 text-yellow-400" />
              <h3 className="text-lg font-semibold text-textPrimary">Pastas</h3>
              <p className="text-textSecondary mt-2">Encontre rapidamente suas pastas</p>
            </div>
            <div className="glass rounded-2xl p-6 text-center">
              <Terminal size={40} className="mx-auto mb-4 text-green-400" />
              <h3 className="text-lg font-semibold text-textPrimary">Programas</h3>
              <p className="text-textSecondary mt-2">Acesse seus aplicativos instalados</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
