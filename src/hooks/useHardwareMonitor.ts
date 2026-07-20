import { useEffect, useState } from 'react';

export interface HardwareMonitorData {
  cpu: number | null;
  ramPercent: number | null;
  netUpMbps: number | null;
  netDownMbps: number | null;
  gpu: number | null;
  ssdPercent: number | null;
  timestamp: number;
}

export function useHardwareMonitor() {
  const [data, setData] = useState<HardwareMonitorData | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).electronAPI) return;

    const api = (window as any).electronAPI;

    // initial fetch
    if (api.hardwareGetStats) {
      void api.hardwareGetStats().then((res: any) => {
        if (res) setData(res);
      }).catch(() => {});
    }

    const listener = (d: any) => {
      setData(d);
    };

    if (api.onHardwareUpdate) api.onHardwareUpdate(listener);

    return () => {
      try {
        if (api && api.removeHardwareListener) api.removeHardwareListener(listener);
        // otherwise ipcRenderer listeners will be cleaned on reload
      } catch (err) {
        // ignore
      }
    };
  }, []);

  return { data };
}

export default useHardwareMonitor;
