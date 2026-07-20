import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 880;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 1.2);
    setTimeout(() => {
      try { o.stop(); ctx.close(); } catch (e) {}
    }, 1400);
  } catch (err) {
    console.warn('Audio not available for beep', err);
  }
}

export function useAgendaAlarms() {
  const agenda = useAppStore((s) => s.agenda);
  const timers = useRef<Record<string, number>>({});

  useEffect(() => {
    // clear previous timers
    Object.values(timers.current).forEach((id) => clearTimeout(id));
    timers.current = {};

    agenda.forEach((event) => {
      try {
        const when = new Date(`${event.date}T${event.time}`);
        const now = new Date();
        const ms = when.getTime() - now.getTime();
        if (ms > 0 && ms < 1000 * 60 * 60 * 24 * 7) {
          const id = window.setTimeout(() => {
            // show notification
            try {
              if (window.Notification && Notification.permission === 'granted') {
                new Notification('Lembrete: ' + event.title, { body: event.description ?? '', silent: false });
              } else if (window.Notification && Notification.permission !== 'denied') {
                Notification.requestPermission().then((perm) => {
                  if (perm === 'granted') new Notification('Lembrete: ' + event.title, { body: event.description ?? '' });
                });
              }
            } catch (err) {
              console.warn('Notification error', err);
            }
            // play beep
            playBeep();
          }, ms);

          timers.current[event.id] = id as unknown as number;
        }
      } catch (err) {
        // ignore invalid dates
      }
    });

    return () => {
      Object.values(timers.current).forEach((id) => clearTimeout(id));
      timers.current = {};
    };
  }, [agenda]);
}

export default useAgendaAlarms;
