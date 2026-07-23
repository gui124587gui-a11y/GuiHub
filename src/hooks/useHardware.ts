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
  gpuHistory: number[];
  ssdHistory: number[];
  networkHistory: number[];
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
  cpuTemperature: number | null;
  cpuClock: number | null;
  cpuCores: number | null;
  cpuThreads: number | null;
  gpuTemperature: number | null;
  gpuClock: number | null;
  gpuMemoryClock: number | null;
  gpuVramUsed: string | null;
  gpuFanSpeed: number | null;
  ramUsedGb: number | null;
  ramTotalGb: number | null;
  ramFrequency: number | null;
  ssdUsedGb: number | null;
  ssdTotalGb: number | null;
  ssdFreeGb: number | null;
  ssdTemperature: number | null;
  ipAddress: string | null;
  pingMs: number | null;
}

const MAX_HISTORY = 60;
const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const formatMbps = (value: number | null) => {
  if (value == null) return null;
  return `${value.toFixed(value >= 10 ? 1 : 2)} MB/s`;
};

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
    gpuHistory: [],
    ssdHistory: [],
    networkHistory: [],
    cpuModel: 'CPU',
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
    cpuTemperature: null,
    cpuClock: null,
    cpuCores: null,
    cpuThreads: null,
    gpuTemperature: null,
    gpuClock: null,
    gpuMemoryClock: null,
    gpuVramUsed: null,
    gpuFanSpeed: null,
    ramUsedGb: null,
    ramTotalGb: null,
    ramFrequency: null,
    ssdUsedGb: null,
    ssdTotalGb: null,
    ssdFreeGb: null,
    ssdTemperature: null,
    ipAddress: null,
    pingMs: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchHardwareStats = async () => {
    if (typeof window === 'undefined' || !(window as any).electronAPI) return;

    try {
      const data = await (window as any).electronAPI.hardwareGetStats();
      if (!data) return;

      const cpuValue = toNumber(data.cpu ?? data.cpuPercent);
      const ramValue = toNumber(data.ramPercent ?? data.ram);
      const gpuValue = toNumber(data.gpu);
      const ssdValue = toNumber(data.ssdPercent ?? data.ssd);
      const downloadValue = toNumber(data.netDownMbps ?? data.netDown ?? data.internetKbs);
      const uploadValue = toNumber(data.netUpMbps ?? data.netUp ?? data.netUpKbs);

      setHardware(prev => {
        const cpuHistory = [...prev.cpuHistory];
        if (cpuHistory.length >= MAX_HISTORY) cpuHistory.shift();
        cpuHistory.push(cpuValue ?? cpuHistory[cpuHistory.length - 1] ?? 0);

        const ramHistory = [...prev.ramHistory];
        if (ramHistory.length >= MAX_HISTORY) ramHistory.shift();
        ramHistory.push(ramValue ?? ramHistory[ramHistory.length - 1] ?? 0);

        const gpuHistory = [...prev.gpuHistory];
        if (gpuHistory.length >= MAX_HISTORY) gpuHistory.shift();
        gpuHistory.push(gpuValue ?? gpuHistory[gpuHistory.length - 1] ?? 0);

        const ssdHistory = [...prev.ssdHistory];
        if (ssdHistory.length >= MAX_HISTORY) ssdHistory.shift();
        ssdHistory.push(ssdValue ?? ssdHistory[ssdHistory.length - 1] ?? 0);

        const networkHistory = [...prev.networkHistory];
        if (networkHistory.length >= MAX_HISTORY) networkHistory.shift();
        networkHistory.push(downloadValue ?? networkHistory[networkHistory.length - 1] ?? 0);

        const ramUsedGb = toNumber(data.ramUsedGb ?? data.ramUsed);
        const ramTotalGb = toNumber(data.ramTotalGb ?? data.ramTotal);
        const ssdUsedGb = toNumber(data.ssdUsedGb ?? data.ssdUsed);
        const ssdTotalGb = toNumber(data.ssdTotalGb ?? data.ssdTotal);
        const ssdFreeGb = toNumber(data.ssdFreeGb);

        return {
          ...prev,
          cpu: cpuValue,
          ram: ramValue,
          gpu: gpuValue,
          ssd: ssdValue,
          internet: downloadValue,
          internetKbs: downloadValue,
          internetMbs: formatMbps(downloadValue),
          cpuHistory,
          ramHistory,
          gpuHistory,
          ssdHistory,
          networkHistory,
          cpuModel: (data.cpuModel as string) || prev.cpuModel,
          ramUsed: (data.ramUsed as string) || prev.ramUsed,
          ramTotal: (data.ramTotal as string) || prev.ramTotal,
          gpuModel: (data.gpuModel as string) || prev.gpuModel,
          ssdUsed: (data.ssdUsed as string) || prev.ssdUsed,
          ssdTotal: (data.ssdTotal as string) || prev.ssdTotal,
          netUp: uploadValue,
          netDown: downloadValue,
          netUpKbs: uploadValue,
          netDownKbs: downloadValue,
          netUpMbs: formatMbps(uploadValue),
          netDownMbs: formatMbps(downloadValue),
          cpuTemperature: toNumber(data.cpuTemperature),
          cpuClock: toNumber(data.cpuClock),
          cpuCores: toNumber(data.cpuCores),
          cpuThreads: toNumber(data.cpuThreads),
          gpuTemperature: toNumber(data.gpuTemperature),
          gpuClock: toNumber(data.gpuClock),
          gpuMemoryClock: toNumber(data.gpuMemoryClock),
          gpuVramUsed: (data.gpuVramUsed as string) || prev.gpuVramUsed,
          gpuFanSpeed: toNumber(data.gpuFanSpeed),
          ramUsedGb,
          ramTotalGb,
          ramFrequency: toNumber(data.ramFrequency),
          ssdUsedGb,
          ssdTotalGb,
          ssdFreeGb,
          ssdTemperature: toNumber(data.ssdTemperature),
          ipAddress: (data.ipAddress as string) || prev.ipAddress,
          pingMs: toNumber(data.pingMs),
        };
      });
    } catch (err) {
      console.error('Erro ao buscar stats do hardware:', err);
    }
  };

  useEffect(() => {
    fetchHardwareStats().then(() => setIsLoading(false));

    const interval = setInterval(fetchHardwareStats, 2000);
    return () => clearInterval(interval);
  }, []);

  return { hardware, isLoading };
}
