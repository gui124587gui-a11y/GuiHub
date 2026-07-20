const si = (() => {
  try {
    return require('systeminformation');
  } catch (err) {
    console.warn('systeminformation not installed; hardware stats may be limited.');
    return null;
  }
})();
const { exec } = require('child_process');

let _interval = null;
let _lastNet = null;
let _lastStats = {
  cpu: null,
  ramPercent: null,
  netUpMbps: null,
  netDownMbps: null,
  gpu: null,
  ssdPercent: null,
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
    const cpuLoad = si ? await si.currentLoad() : null;
    const mem = si ? await si.mem() : null;
    const fs = si ? await si.fsSize() : null;
    const netStats = si ? await si.networkStats() : null;
    const graphics = si ? await si.graphics().catch(() => ({ controllers: [] })) : null;

    // CPU
    const cpu = cpuLoad ? cpuLoad.currentload : null;

    // RAM percent used
    const ramPercent = mem ? Math.round((1 - mem.available / mem.total) * 100 * 100) / 100 : null;

    // SSD usage - take first fs entry
    let ssdPercent = null;
    if (fs && fs.length) {
      ssdPercent = Math.round((fs[0].use ?? 0) * 100) / 100;
    }

    // Network - compute Mbps using delta
    let netUpMbps = null;
    let netDownMbps = null;
    if (netStats && netStats.length) {
      const totalRx = netStats.reduce((s, n) => s + (n.rx_bytes || 0), 0);
      const totalTx = netStats.reduce((s, n) => s + (n.tx_bytes || 0), 0);
      if (_lastNet) {
        const seconds = (now - _lastNet.t) / 1000;
        netDownMbps = Math.round(bytesToMbps(totalRx - _lastNet.rx, seconds) * 100) / 100;
        netUpMbps = Math.round(bytesToMbps(totalTx - _lastNet.tx, seconds) * 100) / 100;
      }
      _lastNet = { rx: totalRx, tx: totalTx, t: now };
    }

    // GPU - try systeminformation first
    let gpuUsage = null;
    if (graphics && graphics.controllers && graphics.controllers.length) {
      const g = graphics.controllers[0];
      gpuUsage = g.utilizationGpu ?? g.utilizationGpus ?? null;
    }
    if (gpuUsage == null) {
      const fallback = await probeGPUFallback();
      gpuUsage = fallback;
    }

    const data = {
      cpu: cpu != null ? Math.round(cpu * 100) / 100 : null,
      ramPercent,
      netUpMbps,
      netDownMbps,
      gpu: gpuUsage != null ? Number(gpuUsage) : null,
      ssdPercent,
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
