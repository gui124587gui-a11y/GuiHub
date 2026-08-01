
import { useState, useEffect, useCallback } from 'react';
import { spotifyService } from '@/lib/spotifyService';

export function useSpotify() {
  const [isConnected, setIsConnected] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressMs, setProgressMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [repeatState, setRepeatState] = useState<'off' | 'context' | 'track'>('off');
  const [shuffleState, setShuffleState] = useState(false);

  const fetchCurrentPlayback = useCallback(async () => {
    try {
      const data = await spotifyService.getCurrentlyPlaying();
      if (data && data.item) {
        setCurrentTrack(data.item);
        setIsPlaying(Boolean(data.is_playing));
        setProgressMs(data.progress_ms || 0);
        setDurationMs(data.item.duration_ms || 0);
        setRepeatState(data.repeat_state || 'off');
        setShuffleState(Boolean(data.shuffle_state));
      } else {
        setCurrentTrack(null);
      }
    } catch (err) {
      console.error('Erro ao buscar faixa atual:', err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      // If we have tokens, mark connected
      try {
        const me = await spotifyService.getCurrentUser();
        if (me) setIsConnected(true);
      } catch (e) {
        setIsConnected(false);
      }
      await fetchCurrentPlayback();
    };
    init();

    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.onSpotifyAuthSuccess(() => {
        init();
      });
    }

    const interval = setInterval(() => {
      if (isConnected) fetchCurrentPlayback();
    }, 1000);

    return () => clearInterval(interval);
  }, [fetchCurrentPlayback, isConnected]);

  const togglePlay = async () => {
    try {
      if (isPlaying) {
        await spotifyService.pause();
        setIsPlaying(false);
      } else {
        await spotifyService.play();
        setIsPlaying(true);
      }
      setTimeout(fetchCurrentPlayback, 400);
    } catch (err) {
      console.error('Erro ao controlar reprodução:', err);
    }
  };

  const nextTrack = async () => {
    try {
      await spotifyService.next();
      setTimeout(fetchCurrentPlayback, 500);
    } catch (err) {
      console.error('Erro ao ir para próxima faixa:', err);
    }
  };

  const previousTrack = async () => {
    try {
      await spotifyService.previous();
      setTimeout(fetchCurrentPlayback, 500);
    } catch (err) {
      console.error('Erro ao voltar faixa anterior:', err);
    }
  };

  const setVolume = async (percent: number) => {
    try {
      await spotifyService.setVolume(percent);
    } catch (err) {
      console.error('Erro ao definir volume:', err);
    }
  };

  const transferPlayback = async (deviceId: string) => {
    try {
      await spotifyService.transferPlayback(deviceId, true);
    } catch (err) {
      console.error('Erro ao transferir reprodução:', err);
    }
  };

  const toggleShuffle = async () => {
    try {
      const next = !shuffleState;
      await spotifyService.setShuffle(next);
      setShuffleState(next);
    } catch (err) {
      console.error('Erro ao alternar shuffle:', err);
    }
  };

  const cycleRepeat = async () => {
    try {
      const next = repeatState === 'off' ? 'context' : repeatState === 'context' ? 'track' : 'off';
      await spotifyService.setRepeat(next as any);
      setRepeatState(next as any);
    } catch (err) {
      console.error('Erro ao alternar repeat:', err);
    }
  };

  const login = () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) (window as any).electronAPI.spotifyLogin();
  };

  const logout = async () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      await (window as any).electronAPI.spotifyLogout();
      setIsConnected(false);
      setCurrentTrack(null);
    }
  };

  const formatTime = (ms: number) => {
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
    repeatState,
    shuffleState,
    togglePlay,
    nextTrack,
    previousTrack,
    setVolume,
    transferPlayback,
    toggleShuffle,
    cycleRepeat,
    login,
    logout,
    // compatibility aliases
    handleLogin: login,
    handleLogout: logout,
    fetchCurrentPlayback,
    formatTime,
    // expose service directly for advanced usages
    spotifyService,
  };
}
