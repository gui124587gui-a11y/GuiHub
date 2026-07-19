
import { useState, useEffect } from 'react';

export function useSpotify() {
  const [isConnected, setIsConnected] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressMs, setProgressMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  useEffect(() => {
    checkConnection();
    
    // Ouvir evento de sucesso na autenticação
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.onSpotifyAuthSuccess(() => {
        checkConnection();
      });
    }

    // Polling para atualizar a faixa atual (a cada 3 segundos)
    const interval = setInterval(() => {
      if (isConnected) {
        fetchCurrentPlayback();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isConnected]);

  const checkConnection = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const tokens = await window.electronAPI.spotifyGetTokens();
      if (tokens.accessToken) {
        setIsConnected(true);
        fetchCurrentPlayback();
      }
    }
  };

  const fetchCurrentPlayback = async () => {
    try {
      const data = await window.electronAPI.spotifyApi({ endpoint: '/me/player/currently-playing' });
      if (data && data.item) {
        setCurrentTrack(data.item);
        setIsPlaying(data.is_playing);
        setProgressMs(data.progress_ms || 0);
        setDurationMs(data.item.duration_ms || 0);
      } else {
        setCurrentTrack(null);
      }
    } catch (err) {
      console.error('Erro ao buscar faixa atual:', err);
    }
  };

  const togglePlay = async () => {
    try {
      if (isPlaying) {
        await window.electronAPI.spotifyApi({ endpoint: '/me/player/pause', method: 'PUT' });
        setIsPlaying(false);
      } else {
        await window.electronAPI.spotifyApi({ endpoint: '/me/player/play', method: 'PUT' });
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Erro ao controlar reproducao:', err);
    }
  };

  const nextTrack = async () => {
    try {
      await window.electronAPI.spotifyApi({ endpoint: '/me/player/next', method: 'POST' });
      setTimeout(fetchCurrentPlayback, 500);
    } catch (err) {
      console.error('Erro ao ir para proxima faixa:', err);
    }
  };

  const previousTrack = async () => {
    try {
      await window.electronAPI.spotifyApi({ endpoint: '/me/player/previous', method: 'POST' });
      setTimeout(fetchCurrentPlayback, 500);
    } catch (err) {
      console.error('Erro ao ir para faixa anterior:', err);
    }
  };

  const handleLogin = () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.spotifyLogin();
    }
  };

  const handleLogout = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.spotifyLogout();
      setIsConnected(false);
      setCurrentTrack(null);
    }
  };

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    isConnected,
    currentTrack,
    isPlaying,
    progressMs,
    durationMs,
    togglePlay,
    nextTrack,
    previousTrack,
    handleLogin,
    handleLogout,
    formatTime,
  };
}
