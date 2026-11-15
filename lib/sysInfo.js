import os from "os";

let lastCpu = process.cpuUsage();
let lastAt = Date.now();

/** Snapshot ringan metrik proses/OS untuk dashboard realtime. */
export function sysInfo() {
  const total = os.totalmem();
  const free = os.freemem();
  const mem = process.memoryUsage();
  const dtMicros = Math.max(1, (Date.now() - lastAt) * 1000);
  const cu = process.cpuUsage(lastCpu);
  const cores = os.cpus()?.length || 1;
  const cpuPercent = Math.min(100, Math.round(((cu.user + cu.system) / dtMicros / cores) * 100));
  lastCpu = process.cpuUsage();
  lastAt = Date.now();
  return {
    ts: Date.now(),
    cpuPercent,
    load: Number(os.loadavg()[0].toFixed(2)),
    cores,
    memPercent: Math.round(((total - free) / total) * 100),
    heapMB: Math.round(mem.heapUsed / 1048576),
    rssMB: Math.round(mem.rss / 1048576),
    uptime: Math.floor(process.uptime()),
  };
}
