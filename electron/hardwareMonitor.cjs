const si = (() => {
  try {
    return require('systeminformation');
  } catch (err) {
    console.warn('systeminformation not installed; hardware stats may be limited.');
    return null;
  }
})();
const { exec } = require('child_process');
let hwMonitor = null;
try {
  hwMonitor = require('@lynxhub/hwmonitor');
} catch (err) {
  console.warn('hwmonitor not available:', err.message);
}

function normalizeNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function safeArray(value) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

let _interval = null;
let _lastNet = null;
let _lastStats = {
  cpu: null,
  ramPercent: null,
  netUpMbps: null,
  netDownMbps: null,
  gpu: null,
  ssdPercent: null,
  cpuModel: null,
  cpuTemperature: null,
  cpuClock: null,
  cpuCores: null,
  cpuThreads: null,
  gpuModel: null,
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
  timestamp: Date.now(),
};

function bytesToMbps(bytes, seconds) {
  if (!seconds || seconds <= 0) return 0;
  return (bytes * 8) / (1e6) / seconds; // MBits per second
}

async function probeGPUFallback() {
  return new Promise((resolve) => {
    exec('nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits', { timeout: 2000 }, (err, stdout) => {
      if (err || !stdout) return resolve(null);
      const v = Number(String(stdout).trim().split('\n')[0]);
      if (Number.isFinite(v)) return resolve(v);
      return resolve(null);
    });
  });
}

async function sample(mainWindow) {
  const now = Date.now();
  try {
    const cpuLoad = si ? await si.currentLoad().catch(() => null) : null;
    const mem = si ? await si.mem().catch(() => null) : null;
    const fs = si ? await si.fsSize().catch(() => null) : null;
    const netStats = si ? await si.networkStats().catch(() => null) : null;
    const graphics = si ? await si.graphics().catch(() => ({ controllers: [] })) : null;
    const cpuTemp = si ? await si.cpuTemperature().catch(() => null) : null;
    const cpuCurrentspeed = si ? await si.cpuCurrentSpeed().catch(() => null) : null;
    const osInfo = si ? await si.osInfo().catch(() => null) : null;
    const networkInterfaces = si ? await si.networkInterfaces().catch(() => null) : null;

    const cpu = normalizeNumber(cpuLoad?.currentload ?? cpuLoad?.avgLoad);
    const ramPercent = mem
      ? Math.round((1 - mem.available / mem.total) * 100 * 100) / 100
      : null;

    let ssdPercent = null;
    let ssdUsedGb = null;
    let ssdTotalGb = null;
    let ssdFreeGb = null;
    const fsEntries = safeArray(fs);
    if (fsEntries.length) {
      const firstDrive = fsEntries[0] || {};
      ssdPercent = normalizeNumber(firstDrive.use);
      ssdUsedGb = normalizeNumber(firstDrive.used / 1024 / 1024 / 1024);
      ssdTotalGb = normalizeNumber(firstDrive.size / 1024 / 1024 / 1024);
      ssdFreeGb = normalizeNumber(firstDrive.size / 1024 / 1024 / 1024 - firstDrive.used / 1024 / 1024 / 1024);
    }

    const ramUsedGb = mem ? normalizeNumber(mem.used / 1024 / 1024 / 1024) : null;
    const ramTotalGb = mem ? normalizeNumber(mem.total / 1024 / 1024 / 1024) : null;
    const ramFrequency = mem?.frequency != null ? normalizeNumber(mem.frequency) : null;

    let netUpMbps = null;
    let netDownMbps = null;
    const networkEntries = safeArray(netStats);
    if (networkEntries.length) {
      const totalRx = networkEntries.reduce((sum, entry) => sum + (normalizeNumber(entry.rx_bytes) || 0), 0);
      const totalTx = networkEntries.reduce((sum, entry) => sum + (normalizeNumber(entry.tx_bytes) || 0), 0);
      if (_lastNet) {
        const seconds = (now - _lastNet.t) / 1000;
        netDownMbps = Math.round(bytesToMbps(totalRx - _lastNet.rx, seconds) * 100) / 100;
        netUpMbps = Math.round(bytesToMbps(totalTx - _lastNet.tx, seconds) * 100) / 100;
      }
      _lastNet = { rx: totalRx, tx: totalTx, t: now };
    }

    let gpuUsage = null;
    let gpuTemperature = null;
    let gpuClock = null;
    let gpuMemoryClock = null;
    let gpuVramUsed = null;
    let gpuFanSpeed = null;
    let gpuModel = null;

    if (hwMonitor && typeof hwMonitor.getDataOnce === 'function') {
      try {
        const report = await hwMonitor.getDataOnce(['gpu'], 5000);
        const gpuSensor = report?.GPU?.[0]?.Sensors?.find((sensor) => sensor?.Name?.includes('Load') || sensor?.Type === 'Load');
        gpuUsage = normalizeNumber(gpuSensor?.Value);
        gpuModel = report?.GPU?.[0]?.Name || null;
      } catch (err) {
        console.warn('hwmonitor gpu read failed:', err);
      }
    }
    if (gpuUsage == null && graphics && graphics.controllers && graphics.controllers.length) {
      const g = graphics.controllers[0];
      gpuUsage = normalizeNumber(g.utilizationGpu ?? g.utilizationGpus ?? g.utilization);
      gpuModel = g.model || graphics.controllers[0]?.model || null;
    }
    if (gpuUsage == null) {
      const fallback = await probeGPUFallback();
      gpuUsage = normalizeNumber(fallback);
    }

    if (graphics?.controllers?.length) {
      const g = graphics.controllers[0];
      gpuTemperature = normalizeNumber(g.temperatureGpu ?? g.temperature);
      gpuClock = normalizeNumber(g.clockCore ?? g.coreClock);
      gpuMemoryClock = normalizeNumber(g.clockMemory ?? g.memoryClock);
      gpuVramUsed = g.memoryTotal ? `${Math.round((g.memoryUsed ?? 0) / 1024)} MB` : null;
      gpuFanSpeed = normalizeNumber(g.fanSpeed);
      gpuModel = g.model || gpuModel;
    }

    const cpuTemperature = normalizeNumber(cpuTemp?.main ?? cpuTemp?.max ?? cpuTemp?.cores?.[0]?.temp);
    const cpuClock = normalizeNumber(cpuCurrentspeed?.avg ?? cpuCurrentspeed?.max ?? cpuCurrentspeed?.cores?.[0]?.speed);
    const cpuCores = normalizeNumber(cpuLoad?.cpus?.length ?? cpuLoad?.cores);
    const cpuThreads = normalizeNumber(cpuLoad?.cpus?.length ? cpuLoad.cpus.length : null);

    const preferredInterface = networkInterfaces?.find((entry) => entry?.iface === 'Ethernet' || entry?.iface === 'Wi-Fi' || entry?.iface?.includes('Wi')) || networkInterfaces?.[0];
    const ipAddress = preferredInterface?.ip4 || preferredInterface?.ipAddress || null;
    let pingMs = null;
    try {
      const { execSync } = require('child_process');
      const result = execSync('ping -n 1 8.8.8.8', { encoding: 'utf8', timeout: 3000 });
      const match = result.match(/Average = (\d+)ms/);
      if (match) pingMs = Number(match[1]);
    } catch (err) {
      // ignore ping errors
    }

    const data = {
      cpu: cpu != null ? Math.round(cpu * 100) / 100 : null,
      ramPercent,
      netUpMbps,
      netDownMbps,
      gpu: gpuUsage != null ? Number(gpuUsage) : null,
      ssdPercent,
      cpuModel: osInfo?.manufacturer ? `${osInfo.manufacturer} ${osInfo.arch}` : null,
      cpuTemperature,
      cpuClock,
      cpuCores,
      cpuThreads,
      gpuModel,
      gpuTemperature,
      gpuClock,
      gpuMemoryClock,
      gpuVramUsed,
      gpuFanSpeed,
      ramUsedGb,
      ramTotalGb,
      ramFrequency,
      ssdUsedGb,
      ssdTotalGb,
      ssdFreeGb,
      ssdTemperature: null,
      ipAddress,
      pingMs,
      timestamp: now,
    };

    _lastStats = data;

    // Send to renderer when available
    try {
      if (mainWindow && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
        mainWindow.webContents.send('hardware-update', data);
      }
    } catch (err) {
      // ignore
    }

    return data;
  } catch (error) {
    console.warn('hardwareMonitor sample error:', error);
    return _lastStats;
  }
}

function startHardwareMonitor(mainWindow, intervalMs = 2000) {
  if (_interval) clearInterval(_interval);
  // initialize lastNet to avoid large spikes
  _lastNet = { rx: 0, tx: 0, t: Date.now() };
  // initial immediate sample
  void sample(mainWindow);
  _interval = setInterval(() => {
    void sample(mainWindow);
  }, intervalMs);
}

function stopHardwareMonitor() {
  if (_interval) {
    clearInterval(_interval);
    _interval = null;
  }
}

function getLatestStats() {
  return _lastStats;
}

module.exports = {
  startHardwareMonitor,
  stopHardwareMonitor,
  getLatestStats,
};
