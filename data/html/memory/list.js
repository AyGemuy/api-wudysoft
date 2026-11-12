const templates = [{
  html: ({
    name = "NEBULA-X7",
    tag = "PRIME",
    op = "CYBER",
    auth = "BIOMETRIC",
    os = "NEBULA-OS 5.2",
    cpu = "QUANTUM CORE i9",
    node = "v22.14.0",
    bolt = "12.8 GHz",
    chip = "RTX 5090",
    ram = 3.2,
    rss = 1.8,
    total = 16,
    latency = .44,
    throughputHistory = null,
    server = "18:47:23",
    bot = "11:23:47"
  }) => {
    const ramValuePercent = total > 0 ? ram / total * 100 : 0;
    const rssValuePercent = total > 0 ? rss / total * 100 : 0;
    const ramPercent = ramValuePercent.toFixed(1);
    const rssPercent = rssValuePercent.toFixed(1);
    const totalPercent = 100;
    const memoryUsedPercent = ramValuePercent;
    const ramFormatted = `${ram.toFixed(1)} GB`;
    const rssFormatted = `${rss.toFixed(1)} GB`;
    const totalFormatted = `${total.toFixed(1)} GB`;
    const generateThroughputData = () => {
      const points = 8;
      const base = latency;
      const data = [];
      for (let i = 0; i < points; i++) {
        const variation = Math.random() * .4 - .2;
        let val = base * (1 + variation);
        val = Math.max(.1, val);
        data.push(val);
      }
      return data;
    };
    const history = throughputHistory && Array.isArray(throughputHistory) && throughputHistory.length > 0 ? throughputHistory : generateThroughputData();
    const maxLatency = Math.max(...history, latency * 1.2);
    const yMax = Math.max(1, maxLatency * 1.15);
    const latencyDisplay = latency.toFixed(5);
    const barHeights = history.map(val => val / yMax * 100);
    const donutConic = `conic-gradient(#ff44cc 0% ${memoryUsedPercent}%, #142438 ${memoryUsedPercent}% 100%)`;
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>NEBULA · CSS CHARTS · NO CANVAS</title>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Rajdhani:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 1280px; height: 720px; overflow: hidden;
      background: radial-gradient(circle at 30% 40%, #03050a, #010101);
      font-family: 'Rajdhani', sans-serif;
    }
    body { display: flex; justify-content: center; align-items: center; padding: 20px; }
    .dashboard-utama {
      width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.25);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(0, 255, 255, 0.25);
      border-radius: 44px;
      box-shadow: 0 30px 50px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,255,255,0.1) inset;
      padding: 20px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 20px;
    }
    .dashboard-panel {
      background: rgba(8, 12, 24, 0.5);
      backdrop-filter: blur(18px);
      border: 1px solid rgba(0, 255, 255, 0.2);
      border-radius: 28px;
      padding: 18px 20px;
      box-shadow: 0 15px 25px -10px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,255,255,0.05) inset;
      display: flex;
      flex-direction: column;
      position: relative;
      transition: 0.2s;
      width: 100%; height: 100%;
      min-height: 0;
    }
    .dashboard-panel:hover {
      border-color: rgba(255, 68, 204, 0.5);
      box-shadow: 0 0 30px rgba(179,0,255,0.2), 0 0 0 1px rgba(255,68,204,0.2) inset;
    }
    .panel-header {
      font-family: 'Orbitron', sans-serif; font-weight: 700; font-size: 0.95rem; letter-spacing: 4px;
      text-transform: uppercase; color: white; text-shadow: 0 0 12px cyan, 0 0 25px magenta;
      display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 14px;
      padding: 8px 0; background: linear-gradient(90deg, rgba(0,255,255,0.18), rgba(255,68,204,0.12), rgba(179,0,255,0.18));
      border-radius: 40px; border: 0.5px solid rgba(255,255,255,0.15); backdrop-filter: blur(6px);
      width: 100%; text-align: center; box-shadow: 0 0 20px rgba(0,255,255,0.08);
    }
    .panel-header i { font-size: 1.2rem; color: white; text-shadow: 0 0 12px cyan, 0 0 25px magenta; }
    #bot-id .content-row { display: flex; align-items: center; flex: 1; min-height: 0; }
    .bot-avatar {
      width: 80px; height: 80px; background: radial-gradient(circle at 30% 30%, #00ffff, #b300ff);
      border-radius: 50%; display: flex; justify-content: center; align-items: center; margin-right: 20px;
      border: 2px solid white; box-shadow: 0 0 30px #b300ff, 0 0 0 2px rgba(0,255,255,0.3) inset;
    }
    .bot-avatar i { font-size: 3rem; color: white; filter: drop-shadow(0 0 8px black); }
    .bot-info { display: flex; flex-direction: column; gap: 4px; }
    .bot-info .name {
      font-family: 'Orbitron', sans-serif; font-size: 1.4rem; font-weight: 800; color: white;
      text-shadow: 0 0 12px cyan; letter-spacing: 1.5px;
    }
    .bot-info .tag {
      display: inline-block; background: rgba(0,255,255,0.1); border: 0.5px solid cyan; border-radius: 40px;
      padding: 2px 14px; color: #00ffff; font-weight: 700; font-size: 0.75rem; text-shadow: 0 0 8px cyan;
    }
    .bot-info .detail { color: #d0eaff; font-size: 0.95rem; display: flex; gap: 16px; margin-top: 2px; flex-wrap: wrap; }
    .bot-info .detail span {
      color: white; background: rgba(255,68,204,0.2); padding: 3px 12px; border-radius: 30px;
      border: 0.5px solid #ff44cc; font-weight: 600; font-size: 0.8rem;
    }
    .host-badges { display: flex; gap: 20px; margin-top: 12px; color: rgba(255,255,255,0.9); font-size: 0.8rem; flex-wrap: wrap; }
    .host-badges i { margin-right: 6px; color: #00ffff; text-shadow: 0 0 10px cyan; }
    .data-grid { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; flex: 1; }
    .data-row {
      display: flex; justify-content: space-between; align-items: baseline; padding: 6px 0;
      border-bottom: 0.5px solid rgba(0,255,255,0.2);
    }
    .data-row label { color: #b0d0ff; font-size: 0.85rem; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 500; }
    .data-row span {
      font-weight: 700; font-size: 0.95rem; background: linear-gradient(45deg, #00ffff, #ff44cc);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 0 8px cyan;
    }
    /* MEMORY INTEGRITY – CSS DONUT */
    .memory-area {
      display: flex; align-items: center; gap: 14px; margin-bottom: 8px;
      flex: 1; min-height: 0;
    }
    .donut-wrapper {
      position: relative;
      width: 120px;
      height: 120px;
      flex-shrink: 0;
    }
    .donut {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: ${donutConic};
      box-shadow: 0 0 20px #b300ff, 0 0 0 2px rgba(0,255,255,0.3) inset;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .donut::after {
      content: '';
      position: absolute;
      width: 80px;
      height: 80px;
      background: #0a1222;
      border-radius: 50%;
      box-shadow: 0 0 15px #b300ff inset, 0 0 10px rgba(0,255,255,0.5);
    }
    .donut-center {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      text-align: center;
      z-index: 2;
    }
    .donut-center .percent {
      font-family: 'Orbitron', sans-serif; font-size: 26px; font-weight: 900; color: white;
      text-shadow: 0 0 18px cyan, 0 0 30px magenta; line-height: 1;
    }
    .donut-center .label {
      font-size: 11px; letter-spacing: 2px; color: #b0f0ff; text-shadow: 0 0 8px cyan; margin-top: -4px;
    }
    .memory-bar-container { flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    .memory-bar-row { display: flex; align-items: center; gap: 8px; width: 100%; }
    .memory-bar-row label {
      width: 65px; color: #cce6ff; font-size: 0.72rem; font-weight: 600; letter-spacing: 1px;
      text-transform: uppercase; text-shadow: 0 0 6px cyan; flex-shrink: 0;
    }
    .bar-wrapper {
      flex: 1; height: 8px; background: #0a1424; border-radius: 20px;
      box-shadow: inset 0 0 8px black; border: 0.5px solid rgba(0,255,255,0.4); overflow: hidden;
      min-width: 30px;
    }
    .memory-bar { height: 100%; border-radius: 20px; box-shadow: 0 0 12px currentColor; }
    .ram-used-bar { background: #00ffff; }
    .rss-heap-bar { background: #3a6eff; }
    .total-bar { background: #b300ff; }
    .value {
      color: white; background: rgba(0,247,255,0.1); padding: 3px 12px; border-radius: 30px;
      border: 0.5px solid #00ffff; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.5px;
      text-align: right; flex-shrink: 0; min-width: 70px; white-space: nowrap;
    }
    /* THROUGHPUT – CSS BAR CHART */
    .latency-area { text-align: center; margin-bottom: 4px; }
    .latency-value {
      font-family: 'Orbitron', sans-serif; font-weight: 900; font-size: 3rem; color: white;
      text-shadow: 0 0 20px cyan, 0 0 50px magenta; letter-spacing: 6px; line-height: 1;
    }
    .latency-label {
      font-size: 0.7rem; letter-spacing: 5px; text-transform: uppercase; color: #00ffff;
      text-shadow: 0 0 10px magenta; border-bottom: 1px dashed rgba(255,68,204,0.7);
      padding-bottom: 6px; margin-bottom: 6px; display: inline-block;
    }
    .throughput-bars {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      width: 100%;
      height: 100px;
      background: rgba(0,0,0,0.4);
      border-radius: 20px;
      border: 0.5px solid rgba(0,255,255,0.5);
      box-shadow: 0 0 30px rgba(179,0,255,0.2);
      margin-bottom: 8px;
      padding: 12px 8px;
    }
    .bar-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      width: 100%;
      height: 100%;
    }
    .bar {
      width: 70%;
      background: linear-gradient(180deg, #00ffff, #ff44cc);
      border-radius: 4px 4px 0 0;
      box-shadow: 0 0 12px #00ffff;
      transition: height 0.2s;
      height: calc(var(--height) * 1%);
      min-height: 2px;
    }
    .runtime-info {
      display: flex; justify-content: space-between; background: rgba(0,20,40,0.5);
      padding: 10px 16px; border-radius: 20px; border: 0.5px solid rgba(0,255,255,0.4);
      color: white; font-size: 0.75rem; backdrop-filter: blur(4px); margin-top: auto;
    }
    .runtime-info span { display: flex; align-items: center; gap: 6px; color: white; text-shadow: 0 0 8px cyan; }
    .runtime-info i { color: #ff44cc; text-shadow: 0 0 12px magenta; }
    .dashboard-panel { min-height: 0; }
  </style>
</head>
<body>
  <div class="dashboard-utama">
    <!-- BOT ID -->
    <div class="dashboard-panel" id="bot-id">
      <div class="panel-header"><i class="fas fa-microchip"></i> BOT ID</div>
      <div class="content-row">
        <div class="bot-avatar"><i class="fas fa-robot"></i></div>
        <div class="bot-info">
          <div class="name">${name} <span class="tag">⦿ ${tag}</span></div>
          <div class="detail">
            <span>OP: ${op}</span>
            <span>AUTH: ${auth}</span>
          </div>
        </div>
      </div>
      <div class="host-badges" style="margin-top: auto; padding-top: 12px;">
        <span><i class="fas fa-shield-virus"></i> SECURE</span>
        <span><i class="fas fa-crown"></i> ROOT</span>
        <span><i class="fas fa-shield-haltered"></i> ENCRYPTED</span>
      </div>
    </div>
    <!-- HOST ENV -->
    <div class="dashboard-panel" id="host-env">
      <div class="panel-header"><i class="fas fa-server"></i> HOST ENV</div>
      <div class="data-grid">
        <div class="data-row"><label>OS PLATFORM</label><span>${os}</span></div>
        <div class="data-row"><label>CPU MODEL</label><span>${cpu}</span></div>
        <div class="data-row"><label>NODEJS VER</label><span>${node}</span></div>
      </div>
      <div class="host-badges">
        <span><i class="fas fa-bolt"></i> ${bolt}</span>
        <span><i class="fas fa-microchip"></i> ${chip}</span>
      </div>
    </div>
    <!-- MEMORY INTEGRITY – CSS DONUT -->
    <div class="dashboard-panel" id="memory-integrity">
      <div class="panel-header"><i class="fas fa-memory"></i> MEMORY INTEGRITY</div>
      <div class="memory-area">
        <div class="donut-wrapper">
          <div class="donut"></div>
          <div class="donut-center">
            <div class="percent">${Math.round(memoryUsedPercent)}%</div>
            <div class="label">USED</div>
          </div>
        </div>
        <div class="memory-bar-container">
          <div class="memory-bar-row">
            <label>RAM USED</label>
            <div class="bar-wrapper"><div class="memory-bar ram-used-bar" style="width: ${ramPercent}%;"></div></div>
            <span class="value">${ramFormatted}</span>
          </div>
          <div class="memory-bar-row">
            <label>RSS HEAP</label>
            <div class="bar-wrapper"><div class="memory-bar rss-heap-bar" style="width: ${rssPercent}%;"></div></div>
            <span class="value">${rssFormatted}</span>
          </div>
          <div class="memory-bar-row">
            <label>TOTAL</label>
            <div class="bar-wrapper"><div class="memory-bar total-bar" style="width: ${totalPercent}%;"></div></div>
            <span class="value">${totalFormatted}</span>
          </div>
        </div>
      </div>
      <div class="host-badges" style="margin-top: 6px;">
        <span><i class="fas fa-chart-pie"></i> ${memoryUsedPercent.toFixed(1)}% UTILIZED</span>
        <span><i class="fas fa-circle"></i> HEALTHY</span>
      </div>
    </div>
    <!-- LIVE THROUGHPUT – CSS BAR CHART -->
    <div class="dashboard-panel" id="live-throughput">
      <div class="panel-header"><i class="fas fa-wave-square"></i> LIVE THROUGHPUT</div>
      <div class="latency-area">
        <div class="latency-value" id="latencyDisplay">${latencyDisplay}</div>
        <div class="latency-label">RESPONSE (ms)</div>
      </div>
      <div class="throughput-bars">
        ${barHeights.map((h, i) => `
          <div class="bar-item" key="${i}">
            <div class="bar" style="--height: ${h};"></div>
          </div>
        `).join("")}
      </div>
      <div class="runtime-info">
        <span><i class="fas fa-clock"></i> SERVER: ${server}</span>
        <span><i class="fas fa-microchip"></i> BOT: ${bot}</span>
      </div>
    </div>
  </div>
</body>
</html>`;
  }
}, {
  html: ({
    name = "NEBULA-X7",
    tag = "PRIME",
    op = "CYBER",
    auth = "BIOMETRIC",
    os = "NEBULA-OS 5.2",
    cpu = "QUANTUM CORE i9",
    node = "v22.14.0",
    bolt = "12.8 GHz",
    chip = "RTX 5090",
    ram = 3.2,
    rss = 1.8,
    total = 16,
    latency = .44,
    throughputHistory = null,
    server = "18:47:23",
    bot = "11:23:47"
  }) => {
    const ramValuePercent = total > 0 ? ram / total * 100 : 0;
    const rssValuePercent = total > 0 ? rss / total * 100 : 0;
    const ramPercent = ramValuePercent.toFixed(1);
    const rssPercent = rssValuePercent.toFixed(1);
    const totalPercent = 100;
    const memoryUsedPercent = ramValuePercent;
    const ramFormatted = `${ram.toFixed(1)} GB`;
    const rssFormatted = `${rss.toFixed(1)} GB`;
    const totalFormatted = `${total.toFixed(1)} GB`;
    const generateThroughputData = () => {
      const points = 8;
      const base = latency;
      const data = [];
      for (let i = 0; i < points; i++) {
        const variation = Math.random() * .4 - .2;
        let val = base * (1 + variation);
        val = Math.max(.1, val);
        data.push(val);
      }
      return data;
    };
    const history = throughputHistory && Array.isArray(throughputHistory) && throughputHistory.length > 0 ? throughputHistory : generateThroughputData();
    const maxLatency = Math.max(...history, latency * 1.2);
    const yMax = Math.max(1, maxLatency * 1.15);
    const latencyDisplay = latency.toFixed(5);
    const barHeights = history.map(val => val / yMax * 100);
    const donutConic = `conic-gradient(#aa00ff 0% ${memoryUsedPercent}%, #2a1e3c ${memoryUsedPercent}% 100%)`;
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>NEBULA · ROYAL PLASMA</title>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Rajdhani:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 1280px; height: 720px; overflow: hidden;
      background: radial-gradient(circle at 30% 40%, #130b1f, #03010a);
      font-family: 'Rajdhani', sans-serif;
    }
    body { display: flex; justify-content: center; align-items: center; padding: 20px; }
    .dashboard-utama {
      width: 100%; height: 100%;
      background: rgba(10, 5, 20, 0.3);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(170, 0, 255, 0.35);
      border-radius: 44px;
      box-shadow: 0 30px 50px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255, 170, 0, 0.15) inset;
      padding: 20px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 20px;
    }
    .dashboard-panel {
      background: rgba(20, 12, 30, 0.55);
      backdrop-filter: blur(18px);
      border: 1px solid rgba(170, 0, 255, 0.25);
      border-radius: 28px;
      padding: 18px 20px;
      box-shadow: 0 15px 25px -10px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,170,0,0.08) inset;
      display: flex;
      flex-direction: column;
      position: relative;
      transition: 0.2s;
      width: 100%; height: 100%;
      min-height: 0;
    }
    .dashboard-panel:hover {
      border-color: rgba(255, 170, 0, 0.6);
      box-shadow: 0 0 30px rgba(170,0,255,0.3), 0 0 0 1px rgba(255,170,0,0.3) inset;
    }
    .panel-header {
      font-family: 'Orbitron', sans-serif; font-weight: 700; font-size: 0.95rem; letter-spacing: 4px;
      text-transform: uppercase; color: white; text-shadow: 0 0 12px #aa00ff, 0 0 25px #ffaa00;
      display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 14px;
      padding: 8px 0; background: linear-gradient(90deg, rgba(170,0,255,0.2), rgba(255,170,0,0.15), rgba(170,0,255,0.2));
      border-radius: 40px; border: 0.5px solid rgba(255,255,255,0.15); backdrop-filter: blur(6px);
      width: 100%; text-align: center; box-shadow: 0 0 20px rgba(170,0,255,0.15);
    }
    .panel-header i { font-size: 1.2rem; color: white; text-shadow: 0 0 12px #aa00ff, 0 0 25px #ffaa00; }
    #bot-id .content-row { display: flex; align-items: center; flex: 1; min-height: 0; }
    .bot-avatar {
      width: 80px; height: 80px; background: radial-gradient(circle at 30% 30%, #aa00ff, #ff5500);
      border-radius: 50%; display: flex; justify-content: center; align-items: center; margin-right: 20px;
      border: 2px solid white; box-shadow: 0 0 30px #aa00ff, 0 0 0 2px rgba(255,170,0,0.4) inset;
    }
    .bot-avatar i { font-size: 3rem; color: white; filter: drop-shadow(0 0 8px black); }
    .bot-info { display: flex; flex-direction: column; gap: 4px; }
    .bot-info .name {
      font-family: 'Orbitron', sans-serif; font-size: 1.4rem; font-weight: 800; color: white;
      text-shadow: 0 0 12px #aa00ff; letter-spacing: 1.5px;
    }
    .bot-info .tag {
      display: inline-block; background: rgba(170,0,255,0.1); border: 0.5px solid #aa00ff; border-radius: 40px;
      padding: 2px 14px; color: #ffaa00; font-weight: 700; font-size: 0.75rem; text-shadow: 0 0 8px #ffaa00;
    }
    .bot-info .detail { color: #e0c0ff; font-size: 0.95rem; display: flex; gap: 16px; margin-top: 2px; flex-wrap: wrap; }
    .bot-info .detail span {
      color: white; background: rgba(170,0,255,0.2); padding: 3px 12px; border-radius: 30px;
      border: 0.5px solid #ffaa00; font-weight: 600; font-size: 0.8rem;
    }
    .host-badges { display: flex; gap: 20px; margin-top: 12px; color: rgba(255,255,255,0.9); font-size: 0.8rem; flex-wrap: wrap; }
    .host-badges i { margin-right: 6px; color: #ffaa00; text-shadow: 0 0 10px #aa00ff; }
    .data-grid { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; flex: 1; }
    .data-row {
      display: flex; justify-content: space-between; align-items: baseline; padding: 6px 0;
      border-bottom: 0.5px solid rgba(170,0,255,0.3);
    }
    .data-row label { color: #d0b0ff; font-size: 0.85rem; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 500; }
    .data-row span {
      font-weight: 700; font-size: 0.95rem; background: linear-gradient(45deg, #aa00ff, #ffaa00);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 0 8px #aa00ff;
    }
    /* MEMORY – CSS DONUT ROYAL */
    .memory-area {
      display: flex; align-items: center; gap: 14px; margin-bottom: 8px;
      flex: 1; min-height: 0;
    }
    .donut-wrapper {
      position: relative;
      width: 120px;
      height: 120px;
      flex-shrink: 0;
    }
    .donut {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: ${donutConic};
      box-shadow: 0 0 20px #aa00ff, 0 0 0 2px rgba(255,170,0,0.4) inset;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .donut::after {
      content: '';
      position: absolute;
      width: 80px;
      height: 80px;
      background: #140d1e;
      border-radius: 50%;
      box-shadow: 0 0 15px #aa00ff inset, 0 0 10px rgba(255,170,0,0.5);
    }
    .donut-center {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      text-align: center;
      z-index: 2;
    }
    .donut-center .percent {
      font-family: 'Orbitron', sans-serif; font-size: 26px; font-weight: 900; color: white;
      text-shadow: 0 0 18px #aa00ff, 0 0 30px #ffaa00; line-height: 1;
    }
    .donut-center .label {
      font-size: 11px; letter-spacing: 2px; color: #ffccaa; text-shadow: 0 0 8px #ffaa00; margin-top: -4px;
    }
    .memory-bar-container { flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    .memory-bar-row { display: flex; align-items: center; gap: 8px; width: 100%; }
    .memory-bar-row label {
      width: 65px; color: #dbb5ff; font-size: 0.72rem; font-weight: 600; letter-spacing: 1px;
      text-transform: uppercase; text-shadow: 0 0 6px #aa00ff; flex-shrink: 0;
    }
    .bar-wrapper {
      flex: 1; height: 8px; background: #1a1225; border-radius: 20px;
      box-shadow: inset 0 0 8px black; border: 0.5px solid rgba(170,0,255,0.4); overflow: hidden;
      min-width: 30px;
    }
    .memory-bar { height: 100%; border-radius: 20px; box-shadow: 0 0 12px currentColor; }
    .ram-used-bar { background: linear-gradient(90deg, #aa00ff, #ff5500); }
    .rss-heap-bar { background: linear-gradient(90deg, #7a2cff, #b300ff); }
    .total-bar { background: linear-gradient(90deg, #ffaa00, #ffdd44); }
    .value {
      color: white; background: rgba(170,0,255,0.15); padding: 3px 12px; border-radius: 30px;
      border: 0.5px solid #ffaa00; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.5px;
      text-align: right; flex-shrink: 0; min-width: 70px; white-space: nowrap;
    }
    /* THROUGHPUT – CSS BAR CHART ROYAL */
    .latency-area { text-align: center; margin-bottom: 4px; }
    .latency-value {
      font-family: 'Orbitron', sans-serif; font-weight: 900; font-size: 3rem; color: white;
      text-shadow: 0 0 20px #aa00ff, 0 0 50px #ffaa00; letter-spacing: 6px; line-height: 1;
    }
    .latency-label {
      font-size: 0.7rem; letter-spacing: 5px; text-transform: uppercase; color: #ffaa00;
      text-shadow: 0 0 10px #aa00ff; border-bottom: 1px dashed rgba(255,170,0,0.7);
      padding-bottom: 6px; margin-bottom: 6px; display: inline-block;
    }
    .throughput-bars {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      width: 100%;
      height: 100px;
      background: rgba(8, 4, 16, 0.6);
      border-radius: 20px;
      border: 0.5px solid rgba(170,0,255,0.6);
      box-shadow: 0 0 30px rgba(170,0,255,0.25);
      margin-bottom: 8px;
      padding: 12px 8px;
    }
    .bar-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      width: 100%;
      height: 100%;
    }
    .bar {
      width: 70%;
      background: linear-gradient(180deg, #aa00ff, #ffaa00);
      border-radius: 4px 4px 0 0;
      box-shadow: 0 0 12px #ffaa00;
      transition: height 0.2s;
      height: calc(var(--height) * 1%);
      min-height: 2px;
    }
    .runtime-info {
      display: flex; justify-content: space-between; background: rgba(20,10,30,0.6);
      padding: 10px 16px; border-radius: 20px; border: 0.5px solid rgba(170,0,255,0.5);
      color: white; font-size: 0.75rem; backdrop-filter: blur(4px); margin-top: auto;
    }
    .runtime-info span { display: flex; align-items: center; gap: 6px; color: white; text-shadow: 0 0 8px #aa00ff; }
    .runtime-info i { color: #ffaa00; text-shadow: 0 0 12px #aa00ff; }
    .dashboard-panel { min-height: 0; }
  </style>
</head>
<body>
  <div class="dashboard-utama">
    <!-- BOT ID -->
    <div class="dashboard-panel" id="bot-id">
      <div class="panel-header"><i class="fas fa-microchip"></i> BOT ID</div>
      <div class="content-row">
        <div class="bot-avatar"><i class="fas fa-robot"></i></div>
        <div class="bot-info">
          <div class="name">${name} <span class="tag">⦿ ${tag}</span></div>
          <div class="detail">
            <span>OP: ${op}</span>
            <span>AUTH: ${auth}</span>
          </div>
        </div>
      </div>
      <div class="host-badges" style="margin-top: auto; padding-top: 12px;">
        <span><i class="fas fa-shield-virus"></i> SECURE</span>
        <span><i class="fas fa-crown"></i> ROOT</span>
        <span><i class="fas fa-shield-haltered"></i> ENCRYPTED</span>
      </div>
    </div>
    <!-- HOST ENV -->
    <div class="dashboard-panel" id="host-env">
      <div class="panel-header"><i class="fas fa-server"></i> HOST ENV</div>
      <div class="data-grid">
        <div class="data-row"><label>OS PLATFORM</label><span>${os}</span></div>
        <div class="data-row"><label>CPU MODEL</label><span>${cpu}</span></div>
        <div class="data-row"><label>NODEJS VER</label><span>${node}</span></div>
      </div>
      <div class="host-badges">
        <span><i class="fas fa-bolt"></i> ${bolt}</span>
        <span><i class="fas fa-microchip"></i> ${chip}</span>
      </div>
    </div>
    <!-- MEMORY INTEGRITY – CSS DONUT ROYAL -->
    <div class="dashboard-panel" id="memory-integrity">
      <div class="panel-header"><i class="fas fa-memory"></i> MEMORY INTEGRITY</div>
      <div class="memory-area">
        <div class="donut-wrapper">
          <div class="donut"></div>
          <div class="donut-center">
            <div class="percent">${Math.round(memoryUsedPercent)}%</div>
            <div class="label">USED</div>
          </div>
        </div>
        <div class="memory-bar-container">
          <div class="memory-bar-row">
            <label>RAM USED</label>
            <div class="bar-wrapper"><div class="memory-bar ram-used-bar" style="width: ${ramPercent}%;"></div></div>
            <span class="value">${ramFormatted}</span>
          </div>
          <div class="memory-bar-row">
            <label>RSS HEAP</label>
            <div class="bar-wrapper"><div class="memory-bar rss-heap-bar" style="width: ${rssPercent}%;"></div></div>
            <span class="value">${rssFormatted}</span>
          </div>
          <div class="memory-bar-row">
            <label>TOTAL</label>
            <div class="bar-wrapper"><div class="memory-bar total-bar" style="width: ${totalPercent}%;"></div></div>
            <span class="value">${totalFormatted}</span>
          </div>
        </div>
      </div>
      <div class="host-badges" style="margin-top: 6px;">
        <span><i class="fas fa-chart-pie"></i> ${memoryUsedPercent.toFixed(1)}% UTILIZED</span>
        <span><i class="fas fa-circle"></i> HEALTHY</span>
      </div>
    </div>
    <!-- LIVE THROUGHPUT – CSS BAR CHART ROYAL -->
    <div class="dashboard-panel" id="live-throughput">
      <div class="panel-header"><i class="fas fa-wave-square"></i> LIVE THROUGHPUT</div>
      <div class="latency-area">
        <div class="latency-value">${latencyDisplay}</div>
        <div class="latency-label">RESPONSE (ms)</div>
      </div>
      <div class="throughput-bars">
        ${barHeights.map((h, i) => `
          <div class="bar-item" key="${i}">
            <div class="bar" style="--height: ${h};"></div>
          </div>
        `).join("")}
      </div>
      <div class="runtime-info">
        <span><i class="fas fa-clock"></i> SERVER: ${server}</span>
        <span><i class="fas fa-microchip"></i> BOT: ${bot}</span>
      </div>
    </div>
  </div>
</body>
</html>`;
  }
}, {
  html: ({
    name = "NEBULA-X7",
    tag = "PRIME",
    op = "CYBER",
    auth = "BIOMETRIC",
    os = "NEBULA-OS 5.2",
    cpu = "QUANTUM CORE i9",
    node = "v22.14.0",
    bolt = "12.8 GHz",
    chip = "RTX 5090",
    ram = 3.2,
    rss = 1.8,
    total = 16,
    latency = .44,
    throughputHistory = null,
    server = "18:47:23",
    bot = "11:23:47"
  }) => {
    const ramValuePercent = total > 0 ? ram / total * 100 : 0;
    const rssValuePercent = total > 0 ? rss / total * 100 : 0;
    const ramPercent = ramValuePercent.toFixed(1);
    const rssPercent = rssValuePercent.toFixed(1);
    const totalPercent = 100;
    const memoryUsedPercent = ramValuePercent;
    const ramFormatted = `${ram.toFixed(1)} GB`;
    const rssFormatted = `${rss.toFixed(1)} GB`;
    const totalFormatted = `${total.toFixed(1)} GB`;
    const generateThroughputData = () => {
      const points = 8;
      const base = latency;
      const data = [];
      for (let i = 0; i < points; i++) {
        const variation = Math.random() * .4 - .2;
        let val = base * (1 + variation);
        val = Math.max(.1, val);
        data.push(val);
      }
      return data;
    };
    const history = throughputHistory && Array.isArray(throughputHistory) && throughputHistory.length > 0 ? throughputHistory : generateThroughputData();
    const maxLatency = Math.max(...history, latency * 1.2);
    const yMax = Math.max(1, maxLatency * 1.15);
    const latencyDisplay = latency.toFixed(5);
    const barHeights = history.map(val => val / yMax * 100);
    const donutConic = `conic-gradient(#00ff9d 0% ${memoryUsedPercent}%, #0a1f0a ${memoryUsedPercent}% 100%)`;
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>NEBULA · MATRIX CODE</title>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Rajdhani:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 1280px; height: 720px; overflow: hidden;
      background: radial-gradient(circle at 30% 40%, #0a0f0a, #010101);
      font-family: 'Rajdhani', sans-serif;
      position: relative;
    }
    /* efek scanline (Matrix vibe) */
    body::after {
      content: '';
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background: repeating-linear-gradient(0deg, rgba(0,255,157,0.02) 0px, rgba(0,0,0,0.2) 1px, transparent 2px);
      pointer-events: none;
    }
    body { display: flex; justify-content: center; align-items: center; padding: 20px; }
    .dashboard-utama {
      width: 100%; height: 100%;
      background: rgba(5, 12, 5, 0.3);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(0, 255, 157, 0.4);
      border-radius: 44px;
      box-shadow: 0 30px 50px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,255,157,0.2) inset;
      padding: 20px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 20px;
    }
    .dashboard-panel {
      background: rgba(8, 18, 8, 0.6);
      backdrop-filter: blur(18px);
      border: 1px solid rgba(0, 255, 157, 0.3);
      border-radius: 28px;
      padding: 18px 20px;
      box-shadow: 0 15px 25px -10px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,255,157,0.1) inset;
      display: flex;
      flex-direction: column;
      position: relative;
      transition: 0.2s;
      width: 100%; height: 100%;
      min-height: 0;
    }
    .dashboard-panel:hover {
      border-color: rgba(0, 255, 157, 0.8);
      box-shadow: 0 0 30px rgba(0,255,157,0.3), 0 0 0 1px rgba(0,255,157,0.4) inset;
    }
    .panel-header {
      font-family: 'Orbitron', sans-serif; font-weight: 700; font-size: 0.95rem; letter-spacing: 4px;
      text-transform: uppercase; color: white; text-shadow: 0 0 12px #00ff9d, 0 0 25px #00cc00;
      display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 14px;
      padding: 8px 0; background: linear-gradient(90deg, rgba(0,255,157,0.15), rgba(0,200,0,0.1), rgba(0,255,157,0.15));
      border-radius: 40px; border: 0.5px solid rgba(255,255,255,0.1); backdrop-filter: blur(6px);
      width: 100%; text-align: center; box-shadow: 0 0 20px rgba(0,255,157,0.1);
    }
    .panel-header i { font-size: 1.2rem; color: white; text-shadow: 0 0 12px #00ff9d, 0 0 25px #00cc00; }
    #bot-id .content-row { display: flex; align-items: center; flex: 1; min-height: 0; }
    .bot-avatar {
      width: 80px; height: 80px; background: radial-gradient(circle at 30% 30%, #00ff9d, #004d00);
      border-radius: 50%; display: flex; justify-content: center; align-items: center; margin-right: 20px;
      border: 2px solid #00ff9d; box-shadow: 0 0 30px #00ff9d, 0 0 0 2px rgba(0,255,157,0.4) inset;
    }
    .bot-avatar i { font-size: 3rem; color: black; filter: drop-shadow(0 0 8px #00ff9d); }
    .bot-info { display: flex; flex-direction: column; gap: 4px; }
    .bot-info .name {
      font-family: 'Orbitron', sans-serif; font-size: 1.4rem; font-weight: 800; color: white;
      text-shadow: 0 0 12px #00ff9d; letter-spacing: 1.5px;
    }
    .bot-info .tag {
      display: inline-block; background: rgba(0,255,157,0.1); border: 0.5px solid #00ff9d; border-radius: 40px;
      padding: 2px 14px; color: #00ff9d; font-weight: 700; font-size: 0.75rem; text-shadow: 0 0 8px #00ff9d;
    }
    .bot-info .detail { color: #b0ffb0; font-size: 0.95rem; display: flex; gap: 16px; margin-top: 2px; flex-wrap: wrap; }
    .bot-info .detail span {
      color: black; background: rgba(0,255,157,0.3); padding: 3px 12px; border-radius: 30px;
      border: 0.5px solid #00ff9d; font-weight: 600; font-size: 0.8rem; text-shadow: 0 0 4px #00ff9d;
    }
    .host-badges { display: flex; gap: 20px; margin-top: 12px; color: rgba(255,255,255,0.9); font-size: 0.8rem; flex-wrap: wrap; }
    .host-badges i { margin-right: 6px; color: #00ff9d; text-shadow: 0 0 10px #00ff9d; }
    .data-grid { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; flex: 1; }
    .data-row {
      display: flex; justify-content: space-between; align-items: baseline; padding: 6px 0;
      border-bottom: 0.5px solid rgba(0,255,157,0.3);
    }
    .data-row label { color: #a0ffa0; font-size: 0.85rem; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 500; }
    .data-row span {
      font-weight: 700; font-size: 0.95rem; background: linear-gradient(45deg, #00ff9d, #00aa00);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 0 8px #00ff9d;
    }
    /* MEMORY – CSS DONUT MATRIX */
    .memory-area {
      display: flex; align-items: center; gap: 14px; margin-bottom: 8px;
      flex: 1; min-height: 0;
    }
    .donut-wrapper {
      position: relative;
      width: 120px;
      height: 120px;
      flex-shrink: 0;
    }
    .donut {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: ${donutConic};
      box-shadow: 0 0 20px #00ff9d, 0 0 0 2px rgba(0,255,157,0.4) inset;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .donut::after {
      content: '';
      position: absolute;
      width: 80px;
      height: 80px;
      background: #0d1a0d;
      border-radius: 50%;
      box-shadow: 0 0 15px #00ff9d inset, 0 0 10px rgba(0,255,157,0.5);
    }
    .donut-center {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      text-align: center;
      z-index: 2;
    }
    .donut-center .percent {
      font-family: 'Orbitron', sans-serif; font-size: 26px; font-weight: 900; color: white;
      text-shadow: 0 0 18px #00ff9d, 0 0 30px #00cc00; line-height: 1;
    }
    .donut-center .label {
      font-size: 11px; letter-spacing: 2px; color: #b0ffb0; text-shadow: 0 0 8px #00ff9d; margin-top: -4px;
    }
    .memory-bar-container { flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    .memory-bar-row { display: flex; align-items: center; gap: 8px; width: 100%; }
    .memory-bar-row label {
      width: 65px; color: #b0ffb0; font-size: 0.72rem; font-weight: 600; letter-spacing: 1px;
      text-transform: uppercase; text-shadow: 0 0 6px #00ff9d; flex-shrink: 0;
    }
    .bar-wrapper {
      flex: 1; height: 8px; background: #0a1a0a; border-radius: 20px;
      box-shadow: inset 0 0 8px black; border: 0.5px solid rgba(0,255,157,0.4); overflow: hidden;
      min-width: 30px;
    }
    .memory-bar { height: 100%; border-radius: 20px; box-shadow: 0 0 12px currentColor; }
    .ram-used-bar { background: linear-gradient(90deg, #00ff9d, #00cc00); }
    .rss-heap-bar { background: linear-gradient(90deg, #00bb50, #008800); }
    .total-bar { background: linear-gradient(90deg, #88ff88, #00aa00); }
    .value {
      color: white; background: rgba(0,255,157,0.15); padding: 3px 12px; border-radius: 30px;
      border: 0.5px solid #00ff9d; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.5px;
      text-align: right; flex-shrink: 0; min-width: 70px; white-space: nowrap;
    }
    /* THROUGHPUT – CSS BAR CHART MATRIX */
    .latency-area { text-align: center; margin-bottom: 4px; }
    .latency-value {
      font-family: 'Orbitron', sans-serif; font-weight: 900; font-size: 3rem; color: white;
      text-shadow: 0 0 20px #00ff9d, 0 0 50px #00cc00; letter-spacing: 6px; line-height: 1;
    }
    .latency-label {
      font-size: 0.7rem; letter-spacing: 5px; text-transform: uppercase; color: #00ff9d;
      text-shadow: 0 0 10px #00cc00; border-bottom: 1px dashed rgba(0,255,157,0.7);
      padding-bottom: 6px; margin-bottom: 6px; display: inline-block;
    }
    .throughput-bars {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      width: 100%;
      height: 100px;
      background: rgba(0, 15, 0, 0.7);
      border-radius: 20px;
      border: 0.5px solid rgba(0,255,157,0.6);
      box-shadow: 0 0 30px rgba(0,255,157,0.2);
      margin-bottom: 8px;
      padding: 12px 8px;
    }
    .bar-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      width: 100%;
      height: 100%;
    }
    .bar {
      width: 70%;
      background: linear-gradient(180deg, #00ff9d, #005500);
      border-radius: 4px 4px 0 0;
      box-shadow: 0 0 12px #00ff9d;
      transition: height 0.2s;
      height: calc(var(--height) * 1%);
      min-height: 2px;
    }
    .runtime-info {
      display: flex; justify-content: space-between; background: rgba(10,20,10,0.6);
      padding: 10px 16px; border-radius: 20px; border: 0.5px solid rgba(0,255,157,0.5);
      color: white; font-size: 0.75rem; backdrop-filter: blur(4px); margin-top: auto;
    }
    .runtime-info span { display: flex; align-items: center; gap: 6px; color: white; text-shadow: 0 0 8px #00ff9d; }
    .runtime-info i { color: #00ff9d; text-shadow: 0 0 12px #00cc00; }
    .dashboard-panel { min-height: 0; }
  </style>
</head>
<body>
  <div class="dashboard-utama">
    <!-- BOT ID -->
    <div class="dashboard-panel" id="bot-id">
      <div class="panel-header"><i class="fas fa-microchip"></i> BOT ID</div>
      <div class="content-row">
        <div class="bot-avatar"><i class="fas fa-robot"></i></div>
        <div class="bot-info">
          <div class="name">${name} <span class="tag">⦿ ${tag}</span></div>
          <div class="detail">
            <span>OP: ${op}</span>
            <span>AUTH: ${auth}</span>
          </div>
        </div>
      </div>
      <div class="host-badges" style="margin-top: auto; padding-top: 12px;">
        <span><i class="fas fa-shield-virus"></i> SECURE</span>
        <span><i class="fas fa-crown"></i> ROOT</span>
        <span><i class="fas fa-shield-haltered"></i> ENCRYPTED</span>
      </div>
    </div>
    <!-- HOST ENV -->
    <div class="dashboard-panel" id="host-env">
      <div class="panel-header"><i class="fas fa-server"></i> HOST ENV</div>
      <div class="data-grid">
        <div class="data-row"><label>OS PLATFORM</label><span>${os}</span></div>
        <div class="data-row"><label>CPU MODEL</label><span>${cpu}</span></div>
        <div class="data-row"><label>NODEJS VER</label><span>${node}</span></div>
      </div>
      <div class="host-badges">
        <span><i class="fas fa-bolt"></i> ${bolt}</span>
        <span><i class="fas fa-microchip"></i> ${chip}</span>
      </div>
    </div>
    <!-- MEMORY INTEGRITY – CSS DONUT MATRIX -->
    <div class="dashboard-panel" id="memory-integrity">
      <div class="panel-header"><i class="fas fa-memory"></i> MEMORY INTEGRITY</div>
      <div class="memory-area">
        <div class="donut-wrapper">
          <div class="donut"></div>
          <div class="donut-center">
            <div class="percent">${Math.round(memoryUsedPercent)}%</div>
            <div class="label">USED</div>
          </div>
        </div>
        <div class="memory-bar-container">
          <div class="memory-bar-row">
            <label>RAM USED</label>
            <div class="bar-wrapper"><div class="memory-bar ram-used-bar" style="width: ${ramPercent}%;"></div></div>
            <span class="value">${ramFormatted}</span>
          </div>
          <div class="memory-bar-row">
            <label>RSS HEAP</label>
            <div class="bar-wrapper"><div class="memory-bar rss-heap-bar" style="width: ${rssPercent}%;"></div></div>
            <span class="value">${rssFormatted}</span>
          </div>
          <div class="memory-bar-row">
            <label>TOTAL</label>
            <div class="bar-wrapper"><div class="memory-bar total-bar" style="width: ${totalPercent}%;"></div></div>
            <span class="value">${totalFormatted}</span>
          </div>
        </div>
      </div>
      <div class="host-badges" style="margin-top: 6px;">
        <span><i class="fas fa-chart-pie"></i> ${memoryUsedPercent.toFixed(1)}% UTILIZED</span>
        <span><i class="fas fa-circle"></i> HEALTHY</span>
      </div>
    </div>
    <!-- LIVE THROUGHPUT – CSS BAR CHART MATRIX -->
    <div class="dashboard-panel" id="live-throughput">
      <div class="panel-header"><i class="fas fa-wave-square"></i> LIVE THROUGHPUT</div>
      <div class="latency-area">
        <div class="latency-value">${latencyDisplay}</div>
        <div class="latency-label">RESPONSE (ms)</div>
      </div>
      <div class="throughput-bars">
        ${barHeights.map((h, i) => `
          <div class="bar-item" key="${i}">
            <div class="bar" style="--height: ${h};"></div>
          </div>
        `).join("")}
      </div>
      <div class="runtime-info">
        <span><i class="fas fa-clock"></i> SERVER: ${server}</span>
        <span><i class="fas fa-microchip"></i> BOT: ${bot}</span>
      </div>
    </div>
  </div>
</body>
</html>`;
  }
}];
const getTemplate = (params = {}) => {
  const {
    template: index = 1,
    ...data
  } = params;
  const templateIndex = Number(index) - 1;
  if (!templates[templateIndex]) return "Template tidak ditemukan";
  return templates[templateIndex].html(data);
};
export default getTemplate;