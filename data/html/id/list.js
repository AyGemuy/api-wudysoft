const templates = [{
  html: ({
    header = "NEBULA MECHA",
    tooltip = "CLEARANCE: ALPHA",
    avatar = "https://i.pravatar.cc/400?img=58",
    badge = "SECURITY LVL 7",
    info_pre = "✦ NEBULA CORE ✦",
    info_badge = "MECHA PRO",
    name = "LYRA NOVAK",
    badge_line = "LEAD ASTRO-ENGINEER",
    role = "ORION RESEARCH · DIVISION 7",
    email = "l.novak@orion.neb",
    phone = "+NEB 045-782",
    pin = "SECTOR 42",
    valid = "VALID: 3025",
    clearance = "CLEARANCE: NEB-9",
    mag = "MAG CORE"
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NEBULA MECHA · FUTURISTIC ID</title>
  <!-- Google Fonts: kombinasi futuristik -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;500;700&family=Poppins:wght@400;600;700&family=Montserrat:wght@400;600&family=Rajdhani:wght@400;600&family=Orbitron:wght@500;700&display=swap" rel="stylesheet">
  <!-- Font Awesome 6 (CDN) -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      background: #0a0a14;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Inter', sans-serif;
      padding: 20px;
    }

    .card-container {
      width: 100%;
      max-width: 1000px;
      margin: 0 auto;
    }

    /* Card utama — glass blur, float, tanpa animasi */
    .nebula-card {
      width: 100%;
      background: rgba(8, 6, 18, 0.3);
      backdrop-filter: blur(16px) saturate(200%);
      -webkit-backdrop-filter: blur(16px) saturate(200%);
      border-radius: 48px;
      border: 1px solid rgba(140, 100, 255, 0.4);
      padding: 26px 34px;
      box-shadow: 0 35px 60px -15px rgba(0, 0, 0, 0.9),
                  0 0 0 1px rgba(200, 160, 255, 0.2) inset,
                  0 0 40px rgba(90, 0, 200, 0.3);
      transition: none;
      color: white;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    /* Garis aksen futuristik di pojok */
    .nebula-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 150px;
      height: 150px;
      background: radial-gradient(circle at top left, rgba(180, 130, 255, 0.2), transparent 70%);
      pointer-events: none;
    }

    .nebula-card::after {
      content: '';
      position: absolute;
      bottom: 0;
      right: 0;
      width: 200px;
      height: 200px;
      background: radial-gradient(circle at bottom right, rgba(100, 200, 255, 0.15), transparent 70%);
      pointer-events: none;
    }

    /* HEADER dengan garis bawah bercahaya */
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(170, 130, 255, 0.4);
      padding-bottom: 16px;
      margin-bottom: 22px;
      position: relative;
    }

    .card-header::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      width: 100px;
      height: 2px;
      background: linear-gradient(90deg, #a27eff, transparent);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-left i {
      font-size: 2rem;
      color: #b38eff;
      filter: drop-shadow(0 0 8px #8a6eff);
    }

    .header-left span {
      font-family: 'Orbitron', sans-serif;
      font-weight: 700;
      font-size: 1.5rem;
      letter-spacing: 2px;
      background: linear-gradient(135deg, #ffffff, #cfbaff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .tooltip-badge {
      background: rgba(35, 20, 70, 0.7);
      backdrop-filter: blur(4px);
      padding: 8px 20px;
      border-radius: 40px;
      border: 1px solid rgba(200, 170, 255, 0.6);
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: 'Montserrat', sans-serif;
      font-size: 0.9rem;
      box-shadow: 0 0 10px rgba(150, 100, 255, 0.3);
    }

    .tooltip-badge i {
      color: #ffd966;
      font-size: 1rem;
    }

    .tooltip-text {
      border-bottom: 1px dotted #ccaaff;
      cursor: help;
    }

    /* KONTEN UTAMA */
    .card-content {
      display: flex;
      gap: 32px;
      align-items: flex-start; /* agar badge di bawah avatar rapi */
      flex-wrap: wrap;
      position: relative;
    }

    /* Bagian kiri: avatar + badge di bawah */
    .left-avatar-section {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .avatar-block {
      width: 200px;
      height: 200px;
      background: rgba(25, 15, 45, 0.7);
      border-radius: 32px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      padding: 8px;
      box-shadow: 0 20px 30px -8px #1f0f3a, 0 0 20px rgba(160, 100, 255, 0.3);
    }

    .avatar-block img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 24px;
      display: block;
      background: #2a1a42;
    }

    /* Badge di bawah avatar (shield) */
    .avatar-badge {
      background: rgba(20, 12, 35, 0.8);
      backdrop-filter: blur(4px);
      border: 1px solid rgba(255, 200, 100, 0.6);
      border-radius: 40px;
      padding: 8px 22px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: 'Rajdhani', sans-serif;
      font-weight: 600;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #ffe2a3;
      box-shadow: 0 0 15px rgba(255, 180, 40, 0.3);
    }

    .avatar-badge i {
      font-size: 1.2rem;
      color: #ffbc6c;
      filter: drop-shadow(0 0 5px #ffa24d);
    }

    /* INFO AREA */
    .info-area {
      flex: 1;
      min-width: 260px;
    }

    .info-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .info-pre {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 500;
      font-size: 0.9rem;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: #c3aaff;
    }

    /* Badge di kanan (info area) */
    .info-badge {
      font-family: 'Montserrat', sans-serif;
      font-weight: 600;
      font-size: 0.75rem;
      background: rgba(100, 60, 200, 0.3);
      backdrop-filter: blur(4px);
      padding: 4px 14px;
      border-radius: 40px;
      border: 1px solid rgba(150, 100, 255, 0.8);
      color: #e5d0ff;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      box-shadow: 0 0 10px rgba(150, 100, 255, 0.3);
    }

    .info-area h2 {
      font-family: 'Poppins', sans-serif;
      font-weight: 700;
      font-size: 2.8rem;
      line-height: 1.1;
      color: white;
      margin-bottom: 8px;
      text-shadow: 0 0 15px #634dff;
    }

    .badge-line {
      font-family: 'Montserrat', sans-serif;
      font-weight: 600;
      font-size: 0.9rem;
      background: rgba(70, 40, 130, 0.6);
      border-left: 6px solid #bb9aff;
      padding: 6px 18px;
      border-radius: 0 30px 30px 0;
      margin: 12px 0 10px 0;
      display: inline-block;
      backdrop-filter: blur(4px);
      text-transform: uppercase;
      letter-spacing: 1.5px;
      box-shadow: 0 0 15px rgba(150, 100, 255, 0.2);
    }

    .role-company {
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: 'Inter', sans-serif;
      font-size: 1rem;
      color: #d8c5ff;
      margin-bottom: 16px;
    }

    .role-company i {
      color: #f2bfff;
      font-size: 1.3rem;
      filter: drop-shadow(0 0 5px #ffa0e0);
    }

    .contact-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 20px 32px;
      margin-top: 8px;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.95rem;
      font-family: 'Inter', sans-serif;
    }

    .contact-item i {
      width: 22px;
      color: #ccaaff;
      font-size: 1.2rem;
      filter: drop-shadow(0 0 5px #9f7aff);
    }

    .contact-item .label {
      color: #b19bdd;
      font-weight: 300;
    }

    .contact-item .value {
      color: white;
      font-weight: 500;
      border-bottom: 1px dotted rgba(255, 255, 255, 0.4);
      padding-bottom: 2px;
    }

    /* FOOTER dengan garis atas bercahaya */
    .card-footer {
      display: flex;
      align-items: center;
      gap: 24px;
      border-top: 1px solid rgba(170, 130, 255, 0.4);
      padding-top: 18px;
      margin-top: 24px;
      flex-wrap: wrap;
      position: relative;
    }

    .card-footer::before {
      content: '';
      position: absolute;
      top: -1px;
      right: 0;
      width: 100px;
      height: 2px;
      background: linear-gradient(270deg, #a27eff, transparent);
    }

    .footer-chip {
      background: rgba(30, 18, 55, 0.7);
      backdrop-filter: blur(4px);
      padding: 8px 22px;
      border-radius: 40px;
      border: 1px solid rgba(200, 170, 255, 0.5);
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.9rem;
      font-family: 'Montserrat', sans-serif;
      box-shadow: 0 0 10px rgba(150, 100, 255, 0.2);
    }

    .footer-chip i {
      color: #ffd58c;
      font-size: 1rem;
      filter: drop-shadow(0 0 5px #ffb347);
    }

    .tooltip-dotted {
      border-bottom: 1px dotted #c3a5ff;
      cursor: help;
      margin-left: 4px;
      font-weight: 500;
    }

    /* Hover efek minimal (tanpa animasi) */
    .nebula-card:hover {
      background: rgba(10, 8, 22, 0.4);
    }

    /* Responsif */
    @media (max-width: 750px) {
      .card-content {
        flex-direction: column;
        align-items: center;
      }
      .left-avatar-section {
        align-items: center;
      }
      .info-area {
        text-align: center;
      }
      .info-header-row {
        justify-content: center;
      }
      .badge-line {
        text-align: left;
      }
      .contact-grid {
        justify-content: center;
      }
    }

    @media (max-width: 500px) {
      .nebula-card {
        padding: 20px 22px;
      }
      .info-area h2 {
        font-size: 2.2rem;
      }
      .avatar-block {
        width: 160px;
        height: 160px;
      }
    }
  </style>
</head>
<body>
  <div class="card-container">
    <!-- CARD UTAMA FUTURISTIK -->
    <div class="nebula-card">

      <!-- HEADER dengan tooltip -->
      <div class="card-header">
        <div class="header-left">
          <i class="fas fa-id-card"></i>
          <span>${header}</span>
        </div>
        <div class="tooltip-badge">
          <i class="fas fa-info-circle"></i>
          <span class="tooltip-text">${tooltip}</span>
        </div>
      </div>

      <!-- KONTEN: AVATAR + BADGE DI BAWAH, INFO DI KANAN -->
      <div class="card-content">
        <!-- Bagian kiri: avatar dan badge di bawahnya -->
        <div class="left-avatar-section">
          <div class="avatar-block">
            <img src="${avatar}" alt="avatar">
          </div>
          <!-- Badge di bawah avatar (shield) -->
          <div class="avatar-badge">
            <i class="fas fa-shield-alt"></i>
            <span>${badge}</span>
          </div>
        </div>

        <!-- Info area dengan badge di kanan -->
        <div class="info-area">
          <!-- Baris info-pre dan badge (kiri & kanan) -->
          <div class="info-header-row">
            <span class="info-pre">${info_pre}</span>
            <span class="info-badge"><i class="fas fa-shield" style="margin-right: 4px;"></i>${info_badge}</span>
          </div>
          <h2>${name}</h2>
          <div class="badge-line">${badge_line}</div>
          <div class="role-company">
            <i class="fas fa-crown"></i>
            <span>${role}</span>
          </div>

          <!-- Kontak dengan garis bawah -->
          <div class="contact-grid">
            <div class="contact-item">
              <i class="fas fa-envelope"></i>
              <span class="label">EMAIL</span>
              <span class="value">${email}</span>
            </div>
            <div class="contact-item">
              <i class="fas fa-phone-alt"></i>
              <span class="label">PHONE</span>
              <span class="value">${phone}</span>
            </div>
            <div class="contact-item">
              <i class="fas fa-map-pin"></i>
              <span class="label">BASE</span>
              <span class="value">${pin}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- FOOTER dengan tooltip dan garis atas -->
      <div class="card-footer">
        <div class="footer-chip">
          <i class="fas fa-hourglass-half"></i>
          <span>${valid}</span>
          <span class="tooltip-dotted">(eternal)</span>
        </div>
        <div class="footer-chip">
          <i class="fas fa-shield-alt"></i>
          <span>${clearance}</span>
          <span class="tooltip-dotted">(alpha)</span>
        </div>
        <div class="footer-chip">
          <i class="fas fa-meteor"></i>
          <span>${mag}</span>
          <span class="tooltip-dotted">(tooltip)</span>
        </div>
      </div>
    </div>
  </div>
  <!-- Tidak ada animasi atau javascript -->
</body>
</html>`
}, {
  html: ({
    header = "CYBER DECK",
    tooltip = "NEON v.2077",
    avatar = "https://i.pravatar.cc/400?img=45",
    badge = "NETRUNNER LVL 3",
    info_pre = "✦ NEON JACK ✦",
    info_badge = "GHOST IN",
    name = "ZOE 8K",
    badge_line = "ELITE NETRUNNER",
    role = "BLACK OPS · DECKER",
    email = "zoe@cyber.neb",
    phone = "***-***-782",
    pin = "SECTOR 77",
    valid = "VALID: 2077",
    clearance = "CLEARANCE: OMEGA",
    mag = "NEURAL CORE"
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CYBERPUNK · NEON ID</title>
  <!-- Google Fonts: kombinasi futuristik -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;500;700&family=Poppins:wght@400;600;700&family=Montserrat:wght@400;600&family=Rajdhani:wght@400;600&family=Orbitron:wght@500;700&display=swap" rel="stylesheet">
  <!-- Font Awesome 6 (CDN) -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      background: #0a0a14;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Inter', sans-serif;
      padding: 20px;
    }

    .card-container {
      width: 100%;
      max-width: 1000px;
      margin: 0 auto;
    }

    /* Card utama — glass blur, float, tanpa animasi (tema cyberpunk) */
    .cyber-card {
      width: 100%;
      background: rgba(8, 10, 18, 0.3);
      backdrop-filter: blur(16px) saturate(200%);
      -webkit-backdrop-filter: blur(16px) saturate(200%);
      border-radius: 48px;
      border: 1px solid rgba(0, 255, 200, 0.5);
      padding: 26px 34px;
      box-shadow: 0 35px 60px -15px rgba(0, 255, 200, 0.3),
                  0 0 0 1px rgba(0, 255, 200, 0.2) inset,
                  0 0 40px rgba(0, 200, 255, 0.3);
      transition: none;
      color: white;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    /* Garis aksen cyberpunk di pojok */
    .cyber-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 150px;
      height: 150px;
      background: radial-gradient(circle at top left, rgba(0, 255, 200, 0.2), transparent 70%);
      pointer-events: none;
    }

    .cyber-card::after {
      content: '';
      position: absolute;
      bottom: 0;
      right: 0;
      width: 200px;
      height: 200px;
      background: radial-gradient(circle at bottom right, rgba(255, 0, 200, 0.15), transparent 70%);
      pointer-events: none;
    }

    /* HEADER dengan garis bawah bercahaya neon */
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(0, 255, 200, 0.4);
      padding-bottom: 16px;
      margin-bottom: 22px;
      position: relative;
    }

    .card-header::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      width: 100px;
      height: 2px;
      background: linear-gradient(90deg, #0ff, transparent);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-left i {
      font-size: 2rem;
      color: #0ff;
      filter: drop-shadow(0 0 8px #0ff);
    }

    .header-left span {
      font-family: 'Orbitron', sans-serif;
      font-weight: 700;
      font-size: 1.5rem;
      letter-spacing: 2px;
      background: linear-gradient(135deg, #fff, #0ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .tooltip-badge {
      background: rgba(0, 30, 30, 0.7);
      backdrop-filter: blur(4px);
      padding: 8px 20px;
      border-radius: 40px;
      border: 1px solid rgba(0, 255, 200, 0.6);
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: 'Montserrat', sans-serif;
      font-size: 0.9rem;
      box-shadow: 0 0 10px rgba(0, 255, 200, 0.3);
    }

    .tooltip-badge i {
      color: #ff0;
      font-size: 1rem;
    }

    .tooltip-text {
      border-bottom: 1px dotted #0ff;
      cursor: help;
    }

    /* KONTEN UTAMA */
    .card-content {
      display: flex;
      gap: 32px;
      align-items: flex-start;
      flex-wrap: wrap;
      position: relative;
    }

    /* Bagian kiri: avatar + badge di bawah */
    .left-avatar-section {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .avatar-block {
      width: 200px;
      height: 200px;
      background: rgba(0, 30, 30, 0.7);
      border-radius: 32px;
      border: 2px solid rgba(0, 255, 200, 0.5);
      padding: 8px;
      box-shadow: 0 20px 30px -8px #001f1f, 0 0 20px rgba(0, 255, 200, 0.3);
    }

    .avatar-block img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 24px;
      display: block;
      background: #0a1a1a;
    }

    /* Badge di bawah avatar (cyber) */
    .avatar-badge {
      background: rgba(0, 20, 20, 0.8);
      backdrop-filter: blur(4px);
      border: 1px solid rgba(255, 0, 200, 0.8);
      border-radius: 40px;
      padding: 8px 22px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: 'Rajdhani', sans-serif;
      font-weight: 600;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #ffa0ff;
      box-shadow: 0 0 15px rgba(255, 0, 200, 0.3);
    }

    .avatar-badge i {
      font-size: 1.2rem;
      color: #ff6cff;
      filter: drop-shadow(0 0 5px #ff00c0);
    }

    /* INFO AREA */
    .info-area {
      flex: 1;
      min-width: 260px;
    }

    .info-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .info-pre {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 500;
      font-size: 0.9rem;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: #0ff;
    }

    /* Badge di kanan (info area) */
    .info-badge {
      font-family: 'Montserrat', sans-serif;
      font-weight: 600;
      font-size: 0.75rem;
      background: rgba(0, 200, 200, 0.3);
      backdrop-filter: blur(4px);
      padding: 4px 14px;
      border-radius: 40px;
      border: 1px solid rgba(0, 255, 200, 0.8);
      color: #0ff;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      box-shadow: 0 0 10px rgba(0, 255, 200, 0.3);
    }

    .info-area h2 {
      font-family: 'Poppins', sans-serif;
      font-weight: 700;
      font-size: 2.8rem;
      line-height: 1.1;
      color: white;
      margin-bottom: 8px;
      text-shadow: 0 0 15px #0ff;
    }

    .badge-line {
      font-family: 'Montserrat', sans-serif;
      font-weight: 600;
      font-size: 0.9rem;
      background: rgba(0, 70, 70, 0.6);
      border-left: 6px solid #0ff;
      padding: 6px 18px;
      border-radius: 0 30px 30px 0;
      margin: 12px 0 10px 0;
      display: inline-block;
      backdrop-filter: blur(4px);
      text-transform: uppercase;
      letter-spacing: 1.5px;
      box-shadow: 0 0 15px rgba(0, 255, 200, 0.2);
    }

    .role-company {
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: 'Inter', sans-serif;
      font-size: 1rem;
      color: #a0ffff;
      margin-bottom: 16px;
    }

    .role-company i {
      color: #ff6cff;
      font-size: 1.3rem;
      filter: drop-shadow(0 0 5px #ff00c0);
    }

    .contact-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 20px 32px;
      margin-top: 8px;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.95rem;
      font-family: 'Inter', sans-serif;
    }

    .contact-item i {
      width: 22px;
      color: #0ff;
      font-size: 1.2rem;
      filter: drop-shadow(0 0 5px #0ff);
    }

    .contact-item .label {
      color: #6ff;
      font-weight: 300;
    }

    .contact-item .value {
      color: white;
      font-weight: 500;
      border-bottom: 1px dotted rgba(0, 255, 200, 0.6);
      padding-bottom: 2px;
    }

    /* FOOTER dengan garis atas bercahaya */
    .card-footer {
      display: flex;
      align-items: center;
      gap: 24px;
      border-top: 1px solid rgba(0, 255, 200, 0.4);
      padding-top: 18px;
      margin-top: 24px;
      flex-wrap: wrap;
      position: relative;
    }

    .card-footer::before {
      content: '';
      position: absolute;
      top: -1px;
      right: 0;
      width: 100px;
      height: 2px;
      background: linear-gradient(270deg, #0ff, transparent);
    }

    .footer-chip {
      background: rgba(0, 30, 30, 0.7);
      backdrop-filter: blur(4px);
      padding: 8px 22px;
      border-radius: 40px;
      border: 1px solid rgba(0, 255, 200, 0.5);
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.9rem;
      font-family: 'Montserrat', sans-serif;
      box-shadow: 0 0 10px rgba(0, 255, 200, 0.2);
    }

    .footer-chip i {
      color: #ff0;
      font-size: 1rem;
      filter: drop-shadow(0 0 5px #ff0);
    }

    .tooltip-dotted {
      border-bottom: 1px dotted #0ff;
      cursor: help;
      margin-left: 4px;
      font-weight: 500;
    }

    /* Hover efek minimal (tanpa animasi) */
    .cyber-card:hover {
      background: rgba(10, 15, 25, 0.4);
    }

    /* Responsif */
    @media (max-width: 750px) {
      .card-content {
        flex-direction: column;
        align-items: center;
      }
      .left-avatar-section {
        align-items: center;
      }
      .info-area {
        text-align: center;
      }
      .info-header-row {
        justify-content: center;
      }
      .badge-line {
        text-align: left;
      }
      .contact-grid {
        justify-content: center;
      }
    }

    @media (max-width: 500px) {
      .cyber-card {
        padding: 20px 22px;
      }
      .info-area h2 {
        font-size: 2.2rem;
      }
      .avatar-block {
        width: 160px;
        height: 160px;
      }
    }
  </style>
</head>
<body>
  <div class="card-container">
    <!-- CARD CYBERPUNK (TEMA KEDUA) -->
    <div class="cyber-card">

      <!-- HEADER dengan tooltip -->
      <div class="card-header">
        <div class="header-left">
          <i class="fas fa-microchip"></i>
          <span>${header}</span>
        </div>
        <div class="tooltip-badge">
          <i class="fas fa-skull"></i>
          <span class="tooltip-text">${tooltip}</span>
        </div>
      </div>

      <!-- KONTEN: AVATAR + BADGE DI BAWAH, INFO DI KANAN -->
      <div class="card-content">
        <!-- Bagian kiri: avatar dan badge di bawahnya -->
        <div class="left-avatar-section">
          <div class="avatar-block">
            <img src="${avatar}" alt="avatar">
          </div>
          <!-- Badge di bawah avatar (brain) -->
          <div class="avatar-badge">
            <i class="fas fa-brain"></i>
            <span>${badge}</span>
          </div>
        </div>

        <!-- Info area dengan badge di kanan -->
        <div class="info-area">
          <!-- Baris info-pre dan badge (kiri & kanan) -->
          <div class="info-header-row">
            <span class="info-pre">${info_pre}</span>
            <span class="info-badge"><i class="fas fa-ghost" style="margin-right: 4px;"></i>${info_badge}</span>
          </div>
          <h2>${name}</h2>
          <div class="badge-line">${badge_line}</div>
          <div class="role-company">
            <i class="fas fa-crown"></i>
            <span>${role}</span>
          </div>

          <!-- Kontak dengan garis bawah -->
          <div class="contact-grid">
            <div class="contact-item">
              <i class="fas fa-envelope"></i>
              <span class="label">EMAIL</span>
              <span class="value">${email}</span>
            </div>
            <div class="contact-item">
              <i class="fas fa-phone-alt"></i>
              <span class="label">PHONE</span>
              <span class="value">${phone}</span>
            </div>
            <div class="contact-item">
              <i class="fas fa-map-pin"></i>
              <span class="label">BASE</span>
              <span class="value">${pin}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- FOOTER dengan tooltip dan garis atas -->
      <div class="card-footer">
        <div class="footer-chip">
          <i class="fas fa-hourglass-half"></i>
          <span>${valid}</span>
          <span class="tooltip-dotted">(eternal)</span>
        </div>
        <div class="footer-chip">
          <i class="fas fa-shield-alt"></i>
          <span>${clearance}</span>
          <span class="tooltip-dotted">(alpha)</span>
        </div>
        <div class="footer-chip">
          <i class="fas fa-microchip"></i>
          <span>${mag}</span>
          <span class="tooltip-dotted">(tooltip)</span>
        </div>
      </div>
    </div>
  </div>
  <!-- Tidak ada animasi atau javascript -->
</body>
</html>`
}, {
  html: ({
    header = "SOLARIS CORE",
    tooltip = "FLARE STATUS: ACTIVE",
    avatar = "https://i.pravatar.cc/400?img=37",
    badge = "PLASMA SHIELD LVL 9",
    info_pre = "✦ SOLAR FLARE ✦",
    info_badge = "INFERNO",
    name = "KAIUS VANE",
    badge_line = "PRIME IGNITER",
    role = "SOLARIS FLEET · PYRE SECTOR",
    email = "kvane@solaris.core",
    phone = "☀️ 078-FLARE",
    pin = "REACTOR 7",
    valid = "VALID: 3185",
    clearance = "CLEARANCE: SOL-7",
    mag = "CORONA CORE"
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SOLARIS · FIERY ID</title>
  <!-- Google Fonts: kombinasi futuristik -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;500;700&family=Poppins:wght@400;600;700&family=Montserrat:wght@400;600&family=Rajdhani:wght@400;600&family=Orbitron:wght@500;700&display=swap" rel="stylesheet">
  <!-- Font Awesome 6 (CDN) -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      background: #0a0a14;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Inter', sans-serif;
      padding: 20px;
    }

    .card-container {
      width: 100%;
      max-width: 1000px;
      margin: 0 auto;
    }

    /* Card utama — glass blur, float, tanpa animasi (tema solaris) */
    .solaris-card {
      width: 100%;
      background: rgba(20, 8, 8, 0.3);
      backdrop-filter: blur(16px) saturate(200%);
      -webkit-backdrop-filter: blur(16px) saturate(200%);
      border-radius: 48px;
      border: 1px solid rgba(255, 120, 50, 0.5);
      padding: 26px 34px;
      box-shadow: 0 35px 60px -15px rgba(255, 80, 0, 0.4),
                  0 0 0 1px rgba(255, 140, 0, 0.2) inset,
                  0 0 40px rgba(255, 60, 0, 0.3);
      transition: none;
      color: white;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    /* Garis aksen solaris di pojok */
    .solaris-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 150px;
      height: 150px;
      background: radial-gradient(circle at top left, rgba(255, 100, 0, 0.25), transparent 70%);
      pointer-events: none;
    }

    .solaris-card::after {
      content: '';
      position: absolute;
      bottom: 0;
      right: 0;
      width: 200px;
      height: 200px;
      background: radial-gradient(circle at bottom right, rgba(255, 200, 0, 0.2), transparent 70%);
      pointer-events: none;
    }

    /* HEADER dengan garis bawah bercahaya orange */
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 120, 0, 0.4);
      padding-bottom: 16px;
      margin-bottom: 22px;
      position: relative;
    }

    .card-header::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      width: 100px;
      height: 2px;
      background: linear-gradient(90deg, #ff8000, transparent);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-left i {
      font-size: 2rem;
      color: #ff9933;
      filter: drop-shadow(0 0 8px #ff5500);
    }

    .header-left span {
      font-family: 'Orbitron', sans-serif;
      font-weight: 700;
      font-size: 1.5rem;
      letter-spacing: 2px;
      background: linear-gradient(135deg, #fff7e6, #ffbb77);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .tooltip-badge {
      background: rgba(40, 15, 5, 0.7);
      backdrop-filter: blur(4px);
      padding: 8px 20px;
      border-radius: 40px;
      border: 1px solid rgba(255, 140, 0, 0.7);
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: 'Montserrat', sans-serif;
      font-size: 0.9rem;
      box-shadow: 0 0 10px rgba(255, 100, 0, 0.3);
    }

    .tooltip-badge i {
      color: #ffbb33;
      font-size: 1rem;
    }

    .tooltip-text {
      border-bottom: 1px dotted #ffaa33;
      cursor: help;
    }

    /* KONTEN UTAMA */
    .card-content {
      display: flex;
      gap: 32px;
      align-items: flex-start;
      flex-wrap: wrap;
      position: relative;
    }

    /* Bagian kiri: avatar + badge di bawah */
    .left-avatar-section {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .avatar-block {
      width: 200px;
      height: 200px;
      background: rgba(40, 15, 5, 0.7);
      border-radius: 32px;
      border: 2px solid rgba(255, 140, 0, 0.6);
      padding: 8px;
      box-shadow: 0 20px 30px -8px #3f1a00, 0 0 20px rgba(255, 100, 0, 0.3);
    }

    .avatar-block img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 24px;
      display: block;
      background: #2a1a0a;
    }

    /* Badge di bawah avatar (flame) */
    .avatar-badge {
      background: rgba(40, 15, 5, 0.8);
      backdrop-filter: blur(4px);
      border: 1px solid rgba(255, 200, 0, 0.8);
      border-radius: 40px;
      padding: 8px 22px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: 'Rajdhani', sans-serif;
      font-weight: 600;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #ffcc99;
      box-shadow: 0 0 15px rgba(255, 120, 0, 0.3);
    }

    .avatar-badge i {
      font-size: 1.2rem;
      color: #ffaa33;
      filter: drop-shadow(0 0 5px #ff8800);
    }

    /* INFO AREA */
    .info-area {
      flex: 1;
      min-width: 260px;
    }

    .info-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .info-pre {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 500;
      font-size: 0.9rem;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: #ffaa66;
    }

    /* Badge di kanan (info area) */
    .info-badge {
      font-family: 'Montserrat', sans-serif;
      font-weight: 600;
      font-size: 0.75rem;
      background: rgba(200, 80, 0, 0.3);
      backdrop-filter: blur(4px);
      padding: 4px 14px;
      border-radius: 40px;
      border: 1px solid rgba(255, 140, 0, 0.8);
      color: #ffbb77;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      box-shadow: 0 0 10px rgba(255, 100, 0, 0.3);
    }

    .info-area h2 {
      font-family: 'Poppins', sans-serif;
      font-weight: 700;
      font-size: 2.8rem;
      line-height: 1.1;
      color: white;
      margin-bottom: 8px;
      text-shadow: 0 0 15px #ff9933;
    }

    .badge-line {
      font-family: 'Montserrat', sans-serif;
      font-weight: 600;
      font-size: 0.9rem;
      background: rgba(100, 40, 0, 0.6);
      border-left: 6px solid #ff9933;
      padding: 6px 18px;
      border-radius: 0 30px 30px 0;
      margin: 12px 0 10px 0;
      display: inline-block;
      backdrop-filter: blur(4px);
      text-transform: uppercase;
      letter-spacing: 1.5px;
      box-shadow: 0 0 15px rgba(255, 120, 0, 0.2);
    }

    .role-company {
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: 'Inter', sans-serif;
      font-size: 1rem;
      color: #ffbb99;
      margin-bottom: 16px;
    }

    .role-company i {
      color: #ffaa33;
      font-size: 1.3rem;
      filter: drop-shadow(0 0 5px #ff8800);
    }

    .contact-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 20px 32px;
      margin-top: 8px;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.95rem;
      font-family: 'Inter', sans-serif;
    }

    .contact-item i {
      width: 22px;
      color: #ffaa66;
      font-size: 1.2rem;
      filter: drop-shadow(0 0 5px #ff7700);
    }

    .contact-item .label {
      color: #ffbb77;
      font-weight: 300;
    }

    .contact-item .value {
      color: white;
      font-weight: 500;
      border-bottom: 1px dotted rgba(255, 140, 0, 0.6);
      padding-bottom: 2px;
    }

    /* FOOTER dengan garis atas bercahaya */
    .card-footer {
      display: flex;
      align-items: center;
      gap: 24px;
      border-top: 1px solid rgba(255, 120, 0, 0.4);
      padding-top: 18px;
      margin-top: 24px;
      flex-wrap: wrap;
      position: relative;
    }

    .card-footer::before {
      content: '';
      position: absolute;
      top: -1px;
      right: 0;
      width: 100px;
      height: 2px;
      background: linear-gradient(270deg, #ff8000, transparent);
    }

    .footer-chip {
      background: rgba(40, 15, 5, 0.7);
      backdrop-filter: blur(4px);
      padding: 8px 22px;
      border-radius: 40px;
      border: 1px solid rgba(255, 140, 0, 0.6);
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.9rem;
      font-family: 'Montserrat', sans-serif;
      box-shadow: 0 0 10px rgba(255, 100, 0, 0.2);
    }

    .footer-chip i {
      color: #ffcc66;
      font-size: 1rem;
      filter: drop-shadow(0 0 5px #ffaa00);
    }

    .tooltip-dotted {
      border-bottom: 1px dotted #ffaa66;
      cursor: help;
      margin-left: 4px;
      font-weight: 500;
    }

    /* Hover efek minimal (tanpa animasi) */
    .solaris-card:hover {
      background: rgba(25, 12, 8, 0.4);
    }

    /* Responsif */
    @media (max-width: 750px) {
      .card-content {
        flex-direction: column;
        align-items: center;
      }
      .left-avatar-section {
        align-items: center;
      }
      .info-area {
        text-align: center;
      }
      .info-header-row {
        justify-content: center;
      }
      .badge-line {
        text-align: left;
      }
      .contact-grid {
        justify-content: center;
      }
    }

    @media (max-width: 500px) {
      .solaris-card {
        padding: 20px 22px;
      }
      .info-area h2 {
        font-size: 2.2rem;
      }
      .avatar-block {
        width: 160px;
        height: 160px;
      }
    }
  </style>
</head>
<body>
  <div class="card-container">
    <!-- CARD SOLARIS (TEMA KETIGA) -->
    <div class="solaris-card">

      <!-- HEADER dengan tooltip -->
      <div class="card-header">
        <div class="header-left">
          <i class="fas fa-sun"></i>
          <span>${header}</span>
        </div>
        <div class="tooltip-badge">
          <i class="fas fa-fire"></i>
          <span class="tooltip-text">${tooltip}</span>
        </div>
      </div>

      <!-- KONTEN: AVATAR + BADGE DI BAWAH, INFO DI KANAN -->
      <div class="card-content">
        <!-- Bagian kiri: avatar dan badge di bawahnya -->
        <div class="left-avatar-section">
          <div class="avatar-block">
            <img src="${avatar}" alt="avatar">
          </div>
          <!-- Badge di bawah avatar (fire) -->
          <div class="avatar-badge">
            <i class="fas fa-fire"></i>
            <span>${badge}</span>
          </div>
        </div>

        <!-- Info area dengan badge di kanan -->
        <div class="info-area">
          <!-- Baris info-pre dan badge (kiri & kanan) -->
          <div class="info-header-row">
            <span class="info-pre">${info_pre}</span>
            <span class="info-badge"><i class="fas fa-fire" style="margin-right: 4px;"></i>${info_badge}</span>
          </div>
          <h2>${name}</h2>
          <div class="badge-line">${badge_line}</div>
          <div class="role-company">
            <i class="fas fa-crown"></i>
            <span>${role}</span>
          </div>

          <!-- Kontak dengan garis bawah -->
          <div class="contact-grid">
            <div class="contact-item">
              <i class="fas fa-envelope"></i>
              <span class="label">EMAIL</span>
              <span class="value">${email}</span>
            </div>
            <div class="contact-item">
              <i class="fas fa-phone-alt"></i>
              <span class="label">PHONE</span>
              <span class="value">${phone}</span>
            </div>
            <div class="contact-item">
              <i class="fas fa-map-pin"></i>
              <span class="label">BASE</span>
              <span class="value">${pin}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- FOOTER dengan tooltip dan garis atas -->
      <div class="card-footer">
        <div class="footer-chip">
          <i class="fas fa-hourglass-half"></i>
          <span>${valid}</span>
          <span class="tooltip-dotted">(eternal)</span>
        </div>
        <div class="footer-chip">
          <i class="fas fa-shield-alt"></i>
          <span>${clearance}</span>
          <span class="tooltip-dotted">(alpha)</span>
        </div>
        <div class="footer-chip">
          <i class="fas fa-meteor"></i>
          <span>${mag}</span>
          <span class="tooltip-dotted">(tooltip)</span>
        </div>
      </div>
    </div>
  </div>
  <!-- Tidak ada animasi atau javascript -->
</body>
</html>`
}, {
  html: ({
    header = "CRYO STATION",
    tooltip = "TEMP: -196°C",
    avatar = "https://i.pravatar.cc/400?img=22",
    badge = "CRYO SHIELD LVL 5",
    info_pre = "✦ FROST CORE ✦",
    info_badge = "ICE",
    name = "ELARA FROST",
    badge_line = "LEAD CRYOGENICIST",
    role = "ARCTIC DIVISION · ICE SECTOR",
    email = "efrost@cryo.arctic",
    phone = "❄️ 045-FREEZE",
    pin = "STASIS LAB",
    valid = "VALID: 298K",
    clearance = "CLEARANCE: CRYO-7",
    mag = "ABSOLUTE ZERO"
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CRYO · ARCTIC ID</title>
  <!-- Google Fonts: kombinasi futuristik -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;500;700&family=Poppins:wght@400;600;700&family=Montserrat:wght@400;600&family=Rajdhani:wght@400;600&family=Orbitron:wght@500;700&display=swap" rel="stylesheet">
  <!-- Font Awesome 6 (CDN) -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      background: #0a0a14;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Inter', sans-serif;
      padding: 20px;
    }

    .card-container {
      width: 100%;
      max-width: 1000px;
      margin: 0 auto;
    }

    /* Card utama — glass blur, float, tanpa animasi (tema cryo) */
    .cryo-card {
      width: 100%;
      background: rgba(8, 20, 30, 0.3);
      backdrop-filter: blur(16px) saturate(200%);
      -webkit-backdrop-filter: blur(16px) saturate(200%);
      border-radius: 48px;
      border: 1px solid rgba(100, 200, 255, 0.5);
      padding: 26px 34px;
      box-shadow: 0 35px 60px -15px rgba(0, 200, 255, 0.3),
                  0 0 0 1px rgba(100, 220, 255, 0.2) inset,
                  0 0 40px rgba(0, 150, 255, 0.3);
      transition: none;
      color: white;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    /* Garis aksen cryo di pojok */
    .cryo-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 150px;
      height: 150px;
      background: radial-gradient(circle at top left, rgba(100, 220, 255, 0.25), transparent 70%);
      pointer-events: none;
    }

    .cryo-card::after {
      content: '';
      position: absolute;
      bottom: 0;
      right: 0;
      width: 200px;
      height: 200px;
      background: radial-gradient(circle at bottom right, rgba(150, 230, 255, 0.2), transparent 70%);
      pointer-events: none;
    }

    /* HEADER dengan garis bawah bercahaya biru es */
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(100, 200, 255, 0.4);
      padding-bottom: 16px;
      margin-bottom: 22px;
      position: relative;
    }

    .card-header::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      width: 100px;
      height: 2px;
      background: linear-gradient(90deg, #6cf, transparent);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-left i {
      font-size: 2rem;
      color: #8cf;
      filter: drop-shadow(0 0 8px #3cf);
    }

    .header-left span {
      font-family: 'Orbitron', sans-serif;
      font-weight: 700;
      font-size: 1.5rem;
      letter-spacing: 2px;
      background: linear-gradient(135deg, #fff, #a0d0ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .tooltip-badge {
      background: rgba(0, 30, 50, 0.7);
      backdrop-filter: blur(4px);
      padding: 8px 20px;
      border-radius: 40px;
      border: 1px solid rgba(100, 200, 255, 0.7);
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: 'Montserrat', sans-serif;
      font-size: 0.9rem;
      box-shadow: 0 0 10px rgba(0, 200, 255, 0.3);
    }

    .tooltip-badge i {
      color: #9cf;
      font-size: 1rem;
    }

    .tooltip-text {
      border-bottom: 1px dotted #8cf;
      cursor: help;
    }

    /* KONTEN UTAMA */
    .card-content {
      display: flex;
      gap: 32px;
      align-items: flex-start;
      flex-wrap: wrap;
      position: relative;
    }

    /* Bagian kiri: avatar + badge di bawah */
    .left-avatar-section {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .avatar-block {
      width: 200px;
      height: 200px;
      background: rgba(0, 30, 50, 0.7);
      border-radius: 32px;
      border: 2px solid rgba(100, 200, 255, 0.6);
      padding: 8px;
      box-shadow: 0 20px 30px -8px #00334d, 0 0 20px rgba(0, 200, 255, 0.3);
    }

    .avatar-block img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 24px;
      display: block;
      background: #1a3a4a;
    }

    /* Badge di bawah avatar (snowflake) */
    .avatar-badge {
      background: rgba(0, 30, 50, 0.8);
      backdrop-filter: blur(4px);
      border: 1px solid rgba(200, 230, 255, 0.8);
      border-radius: 40px;
      padding: 8px 22px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: 'Rajdhani', sans-serif;
      font-weight: 600;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #bfeaff;
      box-shadow: 0 0 15px rgba(100, 200, 255, 0.3);
    }

    .avatar-badge i {
      font-size: 1.2rem;
      color: #afdfff;
      filter: drop-shadow(0 0 5px #3cf);
    }

    /* INFO AREA */
    .info-area {
      flex: 1;
      min-width: 260px;
    }

    .info-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .info-pre {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 500;
      font-size: 0.9rem;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: #8cf;
    }

    /* Badge di kanan (info area) */
    .info-badge {
      font-family: 'Montserrat', sans-serif;
      font-weight: 600;
      font-size: 0.75rem;
      background: rgba(0, 100, 150, 0.3);
      backdrop-filter: blur(4px);
      padding: 4px 14px;
      border-radius: 40px;
      border: 1px solid rgba(100, 200, 255, 0.8);
      color: #c0eaff;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      box-shadow: 0 0 10px rgba(0, 200, 255, 0.3);
    }

    .info-area h2 {
      font-family: 'Poppins', sans-serif;
      font-weight: 700;
      font-size: 2.8rem;
      line-height: 1.1;
      color: white;
      margin-bottom: 8px;
      text-shadow: 0 0 15px #6cf;
    }

    .badge-line {
      font-family: 'Montserrat', sans-serif;
      font-weight: 600;
      font-size: 0.9rem;
      background: rgba(0, 70, 100, 0.6);
      border-left: 6px solid #6cf;
      padding: 6px 18px;
      border-radius: 0 30px 30px 0;
      margin: 12px 0 10px 0;
      display: inline-block;
      backdrop-filter: blur(4px);
      text-transform: uppercase;
      letter-spacing: 1.5px;
      box-shadow: 0 0 15px rgba(0, 200, 255, 0.2);
    }

    .role-company {
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: 'Inter', sans-serif;
      font-size: 1rem;
      color: #bfeaff;
      margin-bottom: 16px;
    }

    .role-company i {
      color: #8cf;
      font-size: 1.3rem;
      filter: drop-shadow(0 0 5px #3cf);
    }

    .contact-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 20px 32px;
      margin-top: 8px;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.95rem;
      font-family: 'Inter', sans-serif;
    }

    .contact-item i {
      width: 22px;
      color: #8cf;
      font-size: 1.2rem;
      filter: drop-shadow(0 0 5px #3cf);
    }

    .contact-item .label {
      color: #9cf;
      font-weight: 300;
    }

    .contact-item .value {
      color: white;
      font-weight: 500;
      border-bottom: 1px dotted rgba(100, 200, 255, 0.6);
      padding-bottom: 2px;
    }

    /* FOOTER dengan garis atas bercahaya */
    .card-footer {
      display: flex;
      align-items: center;
      gap: 24px;
      border-top: 1px solid rgba(100, 200, 255, 0.4);
      padding-top: 18px;
      margin-top: 24px;
      flex-wrap: wrap;
      position: relative;
    }

    .card-footer::before {
      content: '';
      position: absolute;
      top: -1px;
      right: 0;
      width: 100px;
      height: 2px;
      background: linear-gradient(270deg, #6cf, transparent);
    }

    .footer-chip {
      background: rgba(0, 30, 50, 0.7);
      backdrop-filter: blur(4px);
      padding: 8px 22px;
      border-radius: 40px;
      border: 1px solid rgba(100, 200, 255, 0.6);
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.9rem;
      font-family: 'Montserrat', sans-serif;
      box-shadow: 0 0 10px rgba(0, 200, 255, 0.2);
    }

    .footer-chip i {
      color: #afdfff;
      font-size: 1rem;
      filter: drop-shadow(0 0 5px #3cf);
    }

    .tooltip-dotted {
      border-bottom: 1px dotted #8cf;
      cursor: help;
      margin-left: 4px;
      font-weight: 500;
    }

    /* Hover efek minimal (tanpa animasi) */
    .cryo-card:hover {
      background: rgba(10, 25, 35, 0.4);
    }

    /* Responsif */
    @media (max-width: 750px) {
      .card-content {
        flex-direction: column;
        align-items: center;
      }
      .left-avatar-section {
        align-items: center;
      }
      .info-area {
        text-align: center;
      }
      .info-header-row {
        justify-content: center;
      }
      .badge-line {
        text-align: left;
      }
      .contact-grid {
        justify-content: center;
      }
    }

    @media (max-width: 500px) {
      .cryo-card {
        padding: 20px 22px;
      }
      .info-area h2 {
        font-size: 2.2rem;
      }
      .avatar-block {
        width: 160px;
        height: 160px;
      }
    }
  </style>
</head>
<body>
  <div class="card-container">
    <!-- CARD CRYO (TEMA KEEMPAT) -->
    <div class="cryo-card">

      <!-- HEADER dengan tooltip -->
      <div class="card-header">
        <div class="header-left">
          <i class="fas fa-snowflake"></i>
          <span>${header}</span>
        </div>
        <div class="tooltip-badge">
          <i class="fas fa-temperature-low"></i>
          <span class="tooltip-text">${tooltip}</span>
        </div>
      </div>

      <!-- KONTEN: AVATAR + BADGE DI BAWAH, INFO DI KANAN -->
      <div class="card-content">
        <!-- Bagian kiri: avatar dan badge di bawahnya -->
        <div class="left-avatar-section">
          <div class="avatar-block">
            <img src="${avatar}" alt="avatar">
          </div>
          <!-- Badge di bawah avatar (snowflake) -->
          <div class="avatar-badge">
            <i class="fas fa-snowflake"></i>
            <span>${badge}</span>
          </div>
        </div>

        <!-- Info area dengan badge di kanan -->
        <div class="info-area">
          <!-- Baris info-pre dan badge (kiri & kanan) -->
          <div class="info-header-row">
            <span class="info-pre">${info_pre}</span>
            <span class="info-badge"><i class="fas fa-snowflake" style="margin-right: 4px;"></i>${info_badge}</span>
          </div>
          <h2>${name}</h2>
          <div class="badge-line">${badge_line}</div>
          <div class="role-company">
            <i class="fas fa-crown"></i>
            <span>${role}</span>
          </div>

          <!-- Kontak dengan garis bawah -->
          <div class="contact-grid">
            <div class="contact-item">
              <i class="fas fa-envelope"></i>
              <span class="label">EMAIL</span>
              <span class="value">${email}</span>
            </div>
            <div class="contact-item">
              <i class="fas fa-phone-alt"></i>
              <span class="label">PHONE</span>
              <span class="value">${phone}</span>
            </div>
            <div class="contact-item">
              <i class="fas fa-map-pin"></i>
              <span class="label">BASE</span>
              <span class="value">${pin}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- FOOTER dengan tooltip dan garis atas -->
      <div class="card-footer">
        <div class="footer-chip">
          <i class="fas fa-hourglass-half"></i>
          <span>${valid}</span>
          <span class="tooltip-dotted">(eternal)</span>
        </div>
        <div class="footer-chip">
          <i class="fas fa-shield-alt"></i>
          <span>${clearance}</span>
          <span class="tooltip-dotted">(alpha)</span>
        </div>
        <div class="footer-chip">
          <i class="fas fa-meteor"></i>
          <span>${mag}</span>
          <span class="tooltip-dotted">(tooltip)</span>
        </div>
      </div>
    </div>
  </div>
  <!-- Tidak ada animasi atau javascript -->
</body>
</html>`
}];
const getTemplate = ({
  template: index = 1,
  ...rest
}) => {
  let templateIndex = Number(index);
  if (isNaN(templateIndex) || templateIndex < 1 || templateIndex > templates.length) {
    templateIndex = 1;
  }
  return templates[templateIndex - 1].html({
    ...rest
  });
};
export default getTemplate;