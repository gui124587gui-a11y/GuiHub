import { useState, useEffect } from 'react';

interface HardwareData {
  cpu: number | null;
  ram: number | null;
  gpu: number | null;
  ssd: number | null;
  internet: number | null;
  internetKbs: number | null;
  internetMbs: string | null;
  cpuHistory: number[];
  ramHistory: number[];
  cpuModel: string;
  ramUsed: string | null;
  ramTotal: string | null;
  gpuModel: string | null;
  ssdUsed: string | null;
  ssdTotal: string | null;
  netUp: number | null;
  netDown: number | null;
  netUpKbs: number | null;
  netDownKbs: number | null;
  netUpMbs: string | null;
  netDownMbs: string | null;
}

export function useHardware() {
  const [hardware, setHardware] = useState<HardwareData>({
    cpu: null,
    ram: null,
    gpu: null,
    ssd: null,
    internet: null,
    internetKbs: null,
    internetMbs: null,
    cpuHistory: [],
    ramHistory: [],
    cpuModel: 'E5-2680 v4',
    ramUsed: null,
    ramTotal: null,
    gpuModel: null,
    ssdUsed: null,
    ssdTotal: null,
    netUp: null,
    netDown: null,
    netUpKbs: null,
    netDownKbs: null,
    netUpMbs: null,
    netDownMbs: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchHardwareStats = async () => {
    if (typeof window === 'undefined' || !(window as any).electronAPI) return;
    
    try {
      const data = await (window as any).electronAPI.hardwareGetStats();
      if (data) {
        setHardware(prev => {
          const newCpuHistory = [...prev.cpuHistory];
          if (newCpuHistory.length >= 20) newCpuHistory.shift();
          newCpuHistory.push(Number(data.cpu ?? 0));
          
          const newRamHistory = [...prev.ramHistory];
          if (newRamHistory.length >= 20) newRamHistory.shift();
          newRamHistory.push(Number(data.ram ?? 0));
          
          return {
            ...prev,
            ...data,
            internet: data.internetKbs ?? null, // Backwards compatibility
            netUp: data.netUpKbs ?? null,       // Backwards compatibility
            netDown: data.netDownKbs ?? null,   // Backwards compatibility
            cpuHistory: newCpuHistory,
            ramHistory: newRamHistory,
          };
        });
      }
    } catch (err) {
      console.error('Erro ao buscar stats do hardware:', err);
    }
  };

  useEffect(() => {
    // Initial load
    fetchHardwareStats().then(() => setIsLoading(false));

    // Poll every 2 seconds
    const interval = setInterval(fetchHardwareStats, 2000);

    return () => clearInterval(interval);
  }, []);

  return { hardware, isLoading };
}
