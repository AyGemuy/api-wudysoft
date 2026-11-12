const templates = [{
  html: ({
    company_name = "NEBULA DYNAMICS",
    company_tagline = "MECHA DIVISION",
    id_card = "RFID · v2.7",
    photo_url = "https://i.pravatar.cc/300?u=456",
    badge1_icon = "fa-crown",
    badge1_text = "PILOT ELITE",
    badge2_icon = "fa-shield-alt",
    badge2_text = "CLEARANCE · OMEGA",
    name = "MAKOTO RYUGA",
    title = "LEAD MECHA PILOT",
    title_icon = "fa-robot",
    nik = "2184.0715.2201",
    birth_date = "15 JUL 2084",
    blood_type = "A+",
    religion = "SHINTO",
    address = "GEHINNOM TOWER, LVL 42, TOKYO-3",
    email = "m.ryuga@nebula.mech",
    phone = "+81 90 1234 5678",
    hologram_text = "HOLO",
    id_number = "NBL-87A-X9"
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ID CARD · FUTURISTIC MODERN</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#0b0d17; min-height:100vh; display:flex; align-items:center; justify-content:center; font-family:'Inter',sans-serif; padding:10px; }
    .card-container { width:600px; height:900px; margin:0 auto; border-radius:40px; overflow:hidden; box-shadow:0 30px 60px rgba(0,0,0,0.8),0 0 0 2px rgba(0,255,255,0.2) inset; }
    .futuristic-card { width:100%; height:100%; background:radial-gradient(ellipse at 20% 30%, #132c42, #05070f 80%); position:relative; display:flex; flex-direction:column; padding:30px 28px; color:#eef5ff; font-family:'Space Grotesk','Inter',sans-serif; border:1px solid rgba(0,255,255,0.25); box-shadow:0 0 40px rgba(0,180,255,0.2) inset; }
    .futuristic-card::before { content:""; position:absolute; top:0; left:0; right:0; bottom:0; background-image:linear-gradient(90deg,rgba(0,255,255,0.03) 1px,transparent 1px),linear-gradient(0deg,rgba(0,255,255,0.03) 1px,transparent 1px); background-size:30px 30px; pointer-events:none; }
    .futuristic-card::after { content:""; position:absolute; top:0; left:0; right:0; bottom:0; border-radius:40px; padding:2px; background:linear-gradient(145deg,#00ffff,#aa80ff,#00ccff); -webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0); mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0); -webkit-mask-composite:xor; mask-composite:exclude; pointer-events:none; }
    .card-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; position:relative; z-index:2; padding-bottom:12px; border-bottom:1px solid rgba(0,255,255,0.4); }
    .logo-area { display:flex; align-items:center; gap:12px; }
    .logo-icon { background:rgba(0,255,255,0.1); backdrop-filter:blur(10px); width:52px; height:52px; border-radius:18px; display:flex; align-items:center; justify-content:center; font-size:28px; color:#00ffff; border:1px solid #00ffff; box-shadow:0 0 15px cyan; }
    .company-text { line-height:1.2; }
    .company-name { font-weight:700; font-size:1.3rem; letter-spacing:2px; background:linear-gradient(135deg,#fff,#aaddff); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .company-tagline { font-size:0.6rem; font-weight:300; color:#aaccff; letter-spacing:1px; }
    .chip { background:rgba(255,255,255,0.05); backdrop-filter:blur(10px); border:1px solid #00ffff; border-radius:16px; padding:6px 18px; display:flex; align-items:center; gap:10px; font-size:0.8rem; font-weight:600; color:#00ffff; box-shadow:0 0 20px rgba(0,255,255,0.3); }
    .chip i { font-size:1rem; }
    .photo-section { display:flex; align-items:center; gap:24px; margin-bottom:24px; position:relative; z-index:2; }
    .photo-frame { width:140px; height:140px; border-radius:24px; background:linear-gradient(135deg,#00ffff,#aa80ff); padding:3px; box-shadow:0 0 30px rgba(0,255,255,0.5); }
    .photo-frame img { width:100%; height:100%; border-radius:22px; object-fit:cover; border:2px solid #0b0d17; display:block; }
    .badge-list { display:flex; flex-direction:column; gap:10px; }
    .badge { background:rgba(10,20,40,0.6); backdrop-filter:blur(10px); border:1px solid rgba(0,255,255,0.6); border-radius:40px; padding:8px 20px; font-weight:600; font-size:0.8rem; display:flex; align-items:center; gap:8px; color:#b0f0ff; box-shadow:0 0 15px rgba(0,255,255,0.2); }
    .badge i { color:#00ffff; }
    .name-title { margin-bottom:24px; position:relative; z-index:2; }
    .name-title h1 { font-weight:700; font-size:2.5rem; line-height:1.1; letter-spacing:-0.5px; background:linear-gradient(135deg,#ffffff,#b5dcff); -webkit-background-clip:text; -webkit-text-fill-color:transparent; text-shadow:0 0 20px rgba(0,180,255,0.4); }
    .name-title .title { display:inline-block; background:rgba(0,255,255,0.1); backdrop-filter:blur(8px); border:1px solid #00ffff; padding:6px 22px; border-radius:40px; font-size:0.9rem; font-weight:500; color:#aaddff; margin-top:8px; letter-spacing:1px; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px 20px; background:rgba(5,15,25,0.6); backdrop-filter:blur(12px); border:1px solid rgba(0,255,255,0.3); border-radius:32px; padding:22px 20px; margin-bottom:24px; position:relative; z-index:2; box-shadow:0 10px 30px rgba(0,0,0,0.5),0 0 0 1px rgba(0,255,255,0.2) inset; }
    .info-item { display:flex; flex-direction:column; }
    .info-label { font-size:0.55rem; font-weight:400; text-transform:uppercase; letter-spacing:2px; color:#88ccff; margin-bottom:4px; }
    .info-value { font-weight:600; font-size:1rem; color:white; border-bottom:1px dashed #00ffff; padding-bottom:4px; }
    .contact-row { display:flex; gap:24px; background:rgba(0,20,40,0.5); backdrop-filter:blur(10px); border:1px solid rgba(0,255,255,0.3); border-radius:50px; padding:14px 24px; margin-bottom:20px; position:relative; z-index:2; justify-content:center; }
    .contact-item { display:flex; align-items:center; gap:10px; font-size:0.9rem; color:#ccf0ff; }
    .contact-item i { color:#00ffff; font-size:1.2rem; filter:drop-shadow(0 0 8px cyan); }
    .card-footer { display:flex; align-items:center; justify-content:space-between; margin-top:auto; padding-top:16px; border-top:1px solid rgba(0,255,255,0.3); position:relative; z-index:2; }
    .hologram { background:linear-gradient(45deg,#00c8ff,#a05eff,#00c8ff); width:90px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.7rem; color:#0b0d17; text-transform:uppercase; border:1px solid white; box-shadow:0 0 20px cyan; }
    .barcode { display:flex; align-items:center; gap:6px; background:rgba(0,0,0,0.4); padding:6px 16px; border-radius:40px; border:1px solid cyan; }
    .barcode span { display:block; width:3px; height:30px; background:#00ffff; border-radius:2px; }
    .barcode span.thin { width:2px; }
    .barcode span.wide { width:8px; }
    .barcode span.medium { width:5px; }
    .id-small { text-align:right; font-size:0.7rem; color:#99ccff; border-left:1px solid cyan; padding-left:16px; }
    .id-small .num { font-weight:700; font-size:1rem; color:white; letter-spacing:1px; }
  </style>
</head>
<body>
  <div class="card-container">
    <div class="futuristic-card">
      <div class="card-header">
        <div class="logo-area">
          <div class="logo-icon"><i class="fas fa-microchip"></i></div>
          <div class="company-text">
            <div class="company-name">${company_name}</div>
            <div class="company-tagline">${company_tagline}</div>
          </div>
        </div>
        <div class="chip"><i class="fas fa-id-card"></i><span>${id_card}</span></div>
      </div>
      <div class="photo-section">
        <div class="photo-frame"><img src="${photo_url}" alt="profile"></div>
        <div class="badge-list">
          <div class="badge"><i class="fas ${badge1_icon}"></i> ${badge1_text}</div>
          <div class="badge"><i class="fas ${badge2_icon}"></i> ${badge2_text}</div>
        </div>
      </div>
      <div class="name-title">
        <h1>${name}</h1>
        <span class="title"><i class="fas ${title_icon}" style="margin-right:8px;"></i> ${title}</span>
      </div>
      <div class="info-grid">
        <div class="info-item"><span class="info-label">NIK</span><span class="info-value">${nik}</span></div>
        <div class="info-item"><span class="info-label">TGL LAHIR</span><span class="info-value">${birth_date}</span></div>
        <div class="info-item"><span class="info-label">GOL. DARAH</span><span class="info-value">${blood_type}</span></div>
        <div class="info-item"><span class="info-label">AGAMA</span><span class="info-value">${religion}</span></div>
        <div class="info-item" style="grid-column:span 2;"><span class="info-label">BASIS</span><span class="info-value">${address}</span></div>
      </div>
      <div class="contact-row">
        <div class="contact-item"><i class="fas fa-envelope"></i><span>${email}</span></div>
        <div class="contact-item"><i class="fas fa-phone-alt"></i><span>${phone}</span></div>
      </div>
      <div class="card-footer">
        <div class="hologram"><i class="fas fa-qrcode" style="margin-right:4px;"></i>${hologram_text}</div>
        <div class="barcode">
          <span class="thin"></span><span class="wide"></span><span class="medium"></span>
          <span class="thin"></span><span class="wide"></span><span class="thin"></span><span class="medium"></span>
        </div>
        <div class="id-small"><div>ID</div><div class="num">${id_number}</div></div>
      </div>
    </div>
  </div>
</body>
</html>`
}, {
  html: ({
    company_name = "NEBULA DYNAMICS",
    company_tagline = "MECHA DIVISION",
    id_card = "EMP-001",
    photo_url = "https://i.pravatar.cc/300?u=789",
    badge1_icon = "fa-star",
    badge1_text = "SENIOR",
    badge2_icon = "fa-shield",
    badge2_text = "ACTIVE",
    name = "MAKOTO RYUGA",
    title = "LEAD ENGINEER",
    title_icon = "fa-laptop-code",
    nik = "1984.0715.2201",
    birth_date = "15 JUL 1984",
    blood_type = "O",
    religion = "ISLAM",
    address = "JL. MERDEKA NO.45, JAKARTA",
    email = "makoto@nebula.com",
    phone = "+62 812 3456 7890",
    hologram_text = "VALID",
    id_number = "NBL-87A-X9"
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ID CARD · LIGHT CLEAN</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#eef2f7; min-height:100vh; display:flex; align-items:center; justify-content:center; font-family:'Inter',sans-serif; padding:10px; }
    .card-container { width:600px; height:900px; margin:0 auto; border-radius:36px; overflow:hidden; box-shadow:0 20px 40px rgba(0,0,0,0.15); }
    .light-card { width:100%; height:100%; background:#ffffff; display:flex; flex-direction:column; padding:30px 28px; position:relative; border:1px solid #e0e7ff; }
    .card-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; padding-bottom:12px; border-bottom:3px solid #1e3a8a; }
    .logo-area { display:flex; align-items:center; gap:12px; }
    .logo-icon { background:#1e3a8a; width:48px; height:48px; border-radius:16px; display:flex; align-items:center; justify-content:center; color:white; font-size:24px; box-shadow:0 4px 10px rgba(30,58,138,0.3); }
    .company-text { line-height:1.2; }
    .company-name { font-weight:700; font-size:1.3rem; color:#0f172a; letter-spacing:0.5px; }
    .company-tagline { font-size:0.6rem; color:#4b5563; }
    .chip { background:#f1f5f9; border-radius:40px; padding:6px 18px; font-size:0.8rem; font-weight:600; color:#1e3a8a; border:1px solid #94a3b8; }
    .photo-section { display:flex; align-items:center; gap:24px; margin-bottom:24px; }
    .photo-frame { width:140px; height:140px; border-radius:50%; background:white; border:4px solid #1e3a8a; box-shadow:0 8px 18px rgba(0,0,0,0.1); overflow:hidden; }
    .photo-frame img { width:100%; height:100%; object-fit:cover; }
    .badge-list { display:flex; flex-direction:column; gap:10px; }
    .badge { background:#dbeafe; border-radius:40px; padding:6px 18px; font-weight:600; font-size:0.8rem; color:#1e3a8a; display:flex; align-items:center; gap:8px; border:1px solid #1e3a8a; }
    .badge i { color:#1e3a8a; }
    .name-title { margin-bottom:20px; }
    .name-title h1 { font-family:'Poppins',sans-serif; font-weight:700; font-size:2.2rem; color:#0f172a; line-height:1.2; margin-bottom:6px; }
    .name-title .title { font-size:1rem; font-weight:600; color:#1e3a8a; background:#e0e7ff; display:inline-block; padding:4px 18px; border-radius:40px; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px 20px; background:#f8fafc; border-radius:24px; padding:20px; margin-bottom:20px; border:1px solid #cbd5e1; }
    .info-item { display:flex; flex-direction:column; }
    .info-label { font-size:0.6rem; font-weight:600; text-transform:uppercase; color:#475569; margin-bottom:2px; }
    .info-value { font-weight:600; font-size:1rem; color:#0f172a; border-bottom:1px dashed #94a3b8; padding-bottom:4px; }
    .contact-row { display:flex; gap:24px; background:#f1f5f9; border-radius:50px; padding:14px 24px; margin-bottom:20px; justify-content:center; border:1px solid #cbd5e1; }
    .contact-item { display:flex; align-items:center; gap:10px; font-size:0.9rem; color:#1e293b; }
    .contact-item i { color:#1e3a8a; font-size:1.2rem; }
    .card-footer { display:flex; align-items:center; justify-content:space-between; margin-top:auto; padding-top:16px; border-top:2px solid #e2e8f0; }
    .hologram { background:#facc15; width:90px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.7rem; color:#0f172a; border:1px solid #eab308; }
    .barcode { display:flex; align-items:center; gap:6px; background:#e2e8f0; padding:6px 16px; border-radius:40px; }
    .barcode span { display:block; width:3px; height:30px; background:#1e293b; border-radius:2px; }
    .barcode span.thin { width:2px; }
    .barcode span.wide { width:8px; }
    .barcode span.medium { width:5px; }
    .id-small { text-align:right; border-left:1px solid #94a3b8; padding-left:16px; }
    .id-small .num { font-weight:700; font-size:1rem; color:#0f172a; letter-spacing:1px; }
  </style>
</head>
<body>
  <div class="card-container">
    <div class="light-card">
      <div class="card-header">
        <div class="logo-area">
          <div class="logo-icon"><i class="fas fa-building"></i></div>
          <div class="company-text">
            <div class="company-name">${company_name}</div>
            <div class="company-tagline">${company_tagline}</div>
          </div>
        </div>
        <div class="chip">${id_card}</div>
      </div>
      <div class="photo-section">
        <div class="photo-frame"><img src="${photo_url}" alt="profile"></div>
        <div class="badge-list">
          <div class="badge"><i class="fas ${badge1_icon}"></i> ${badge1_text}</div>
          <div class="badge"><i class="fas ${badge2_icon}"></i> ${badge2_text}</div>
        </div>
      </div>
      <div class="name-title">
        <h1>${name}</h1>
        <span class="title"><i class="fas ${title_icon}" style="margin-right:8px;"></i> ${title}</span>
      </div>
      <div class="info-grid">
        <div class="info-item"><span class="info-label">NIK</span><span class="info-value">${nik}</span></div>
        <div class="info-item"><span class="info-label">TGL LAHIR</span><span class="info-value">${birth_date}</span></div>
        <div class="info-item"><span class="info-label">GOL. DARAH</span><span class="info-value">${blood_type}</span></div>
        <div class="info-item"><span class="info-label">AGAMA</span><span class="info-value">${religion}</span></div>
        <div class="info-item" style="grid-column:span 2;"><span class="info-label">ALAMAT</span><span class="info-value">${address}</span></div>
      </div>
      <div class="contact-row">
        <div class="contact-item"><i class="fas fa-envelope"></i><span>${email}</span></div>
        <div class="contact-item"><i class="fas fa-phone-alt"></i><span>${phone}</span></div>
      </div>
      <div class="card-footer">
        <div class="hologram"><i class="fas fa-check-circle"></i> ${hologram_text}</div>
        <div class="barcode">
          <span class="thin"></span><span class="wide"></span><span class="medium"></span>
          <span class="thin"></span><span class="wide"></span><span class="thin"></span><span class="medium"></span>
        </div>
        <div class="id-small"><div>ID</div><div class="num">${id_number}</div></div>
      </div>
    </div>
  </div>
</body>
</html>`
}, {
  html: ({
    company_name = "NEBULA DYNAMICS",
    company_tagline = "MECHA DIVISION",
    id_card = "RFID · v2.7",
    photo_url = "https://i.pravatar.cc/300?u=123",
    badge1_icon = "fa-skull",
    badge1_text = "GHOST",
    badge2_icon = "fa-bolt",
    badge2_text = "ELITE",
    name = "MAKOTO RYUGA",
    title = "NIGHT PILOT",
    title_icon = "fa-moon",
    nik = "2184.0715.2201",
    birth_date = "15 JUL 2084",
    blood_type = "AB",
    religion = "BUDDHA",
    address = "NEO TOKYO, SECTOR 7",
    email = "m.ryuga@nebula.mech",
    phone = "+81 90 1234 5678",
    hologram_text = "HOLO",
    id_number = "NBL-87A-X9"
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ID CARD · DARK NEON</title>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#0f0f1a; min-height:100vh; display:flex; align-items:center; justify-content:center; font-family:'Inter',sans-serif; padding:10px; }
    .card-container { width:600px; height:900px; margin:0 auto; border-radius:40px; overflow:hidden; box-shadow:0 30px 60px rgba(0,0,0,0.9),0 0 0 2px #8b5cf6 inset; }
    .dark-card { width:100%; height:100%; background:linear-gradient(145deg,#1a1035,#0d0b1a); position:relative; display:flex; flex-direction:column; padding:30px 28px; color:#f0eaff; font-family:'Orbitron','Inter',sans-serif; border:1px solid #a78bfa40; }
    .dark-card::before { content:""; position:absolute; top:0; left:0; right:0; bottom:0; background:radial-gradient(circle at 30% 40%, #8b5cf620, transparent 60%); pointer-events:none; }
    .card-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; padding-bottom:12px; border-bottom:1px solid #8b5cf6; }
    .logo-area { display:flex; align-items:center; gap:12px; }
    .logo-icon { background:#2a1a4a; width:52px; height:52px; border-radius:18px; display:flex; align-items:center; justify-content:center; font-size:28px; color:#c4b5fd; border:1px solid #c4b5fd; box-shadow:0 0 15px #a78bfa; }
    .company-name { font-weight:700; font-size:1.3rem; letter-spacing:2px; background:linear-gradient(135deg,#fff,#d8b4fe); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .company-tagline { font-size:0.6rem; color:#a78bfa; }
    .chip { background:#1a1035; border:1px solid #c4b5fd; border-radius:16px; padding:6px 18px; display:flex; align-items:center; gap:10px; font-size:0.8rem; color:#c4b5fd; box-shadow:0 0 20px #8b5cf6; }
    .photo-section { display:flex; align-items:center; gap:24px; margin-bottom:24px; }
    .photo-frame { width:140px; height:140px; border-radius:24px; background:linear-gradient(135deg,#8b5cf6,#c084fc); padding:3px; box-shadow:0 0 30px #a78bfa; }
    .photo-frame img { width:100%; height:100%; border-radius:22px; object-fit:cover; border:2px solid #0d0b1a; }
    .badge-list { display:flex; flex-direction:column; gap:10px; }
    .badge { background:#1a1035cc; backdrop-filter:blur(10px); border:1px solid #c4b5fd; border-radius:40px; padding:8px 20px; font-weight:600; font-size:0.8rem; display:flex; align-items:center; gap:8px; color:#e0d0ff; box-shadow:0 0 15px #8b5cf6; }
    .badge i { color:#c084fc; }
    .name-title { margin-bottom:24px; }
    .name-title h1 { font-weight:700; font-size:2.5rem; line-height:1.1; background:linear-gradient(135deg,#ffffff,#e0d0ff); -webkit-background-clip:text; -webkit-text-fill-color:transparent; text-shadow:0 0 20px #a78bfa; }
    .name-title .title { display:inline-block; background:#1e103f; border:1px solid #c4b5fd; padding:6px 22px; border-radius:40px; font-size:0.9rem; color:#d8b4fe; margin-top:8px; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px 20px; background:#0f0b1ecc; backdrop-filter:blur(12px); border:1px solid #8b5cf6; border-radius:32px; padding:22px 20px; margin-bottom:24px; }
    .info-label { font-size:0.55rem; text-transform:uppercase; color:#a78bfa; }
    .info-value { font-weight:600; font-size:1rem; color:white; border-bottom:1px dashed #c084fc; padding-bottom:4px; }
    .contact-row { display:flex; gap:24px; background:#0f0b1e80; backdrop-filter:blur(10px); border:1px solid #8b5cf6; border-radius:50px; padding:14px 24px; margin-bottom:20px; justify-content:center; }
    .contact-item { display:flex; align-items:center; gap:10px; color:#d8b4fe; }
    .contact-item i { color:#c084fc; font-size:1.2rem; filter:drop-shadow(0 0 8px #a78bfa); }
    .card-footer { display:flex; align-items:center; justify-content:space-between; margin-top:auto; padding-top:16px; border-top:1px solid #8b5cf6; }
    .hologram { background:linear-gradient(45deg,#8b5cf6,#c084fc); width:90px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-weight:700; color:#0d0b1a; border:1px solid white; box-shadow:0 0 20px #a78bfa; }
    .barcode { display:flex; align-items:center; gap:6px; background:#1a1035; padding:6px 16px; border-radius:40px; border:1px solid #c4b5fd; }
    .barcode span { background:#c084fc; height:30px; width:3px; border-radius:2px; }
    .barcode span.thin { width:2px; }
    .barcode span.wide { width:8px; }
    .barcode span.medium { width:5px; }
    .id-small { text-align:right; border-left:1px solid #8b5cf6; padding-left:16px; color:#a78bfa; }
    .id-small .num { font-weight:700; font-size:1rem; color:white; }
  </style>
</head>
<body>
  <div class="card-container">
    <div class="dark-card">
      <div class="card-header">
        <div class="logo-area">
          <div class="logo-icon"><i class="fas fa-robot"></i></div>
          <div>
            <div class="company-name">${company_name}</div>
            <div class="company-tagline">${company_tagline}</div>
          </div>
        </div>
        <div class="chip"><i class="fas fa-id-card"></i><span>${id_card}</span></div>
      </div>
      <div class="photo-section">
        <div class="photo-frame"><img src="${photo_url}" alt="profile"></div>
        <div class="badge-list">
          <div class="badge"><i class="fas ${badge1_icon}"></i> ${badge1_text}</div>
          <div class="badge"><i class="fas ${badge2_icon}"></i> ${badge2_text}</div>
        </div>
      </div>
      <div class="name-title">
        <h1>${name}</h1>
        <span class="title"><i class="fas ${title_icon}" style="margin-right:8px;"></i> ${title}</span>
      </div>
      <div class="info-grid">
        <div class="info-item"><span class="info-label">NIK</span><span class="info-value">${nik}</span></div>
        <div class="info-item"><span class="info-label">TGL LAHIR</span><span class="info-value">${birth_date}</span></div>
        <div class="info-item"><span class="info-label">GOL. DARAH</span><span class="info-value">${blood_type}</span></div>
        <div class="info-item"><span class="info-label">AGAMA</span><span class="info-value">${religion}</span></div>
        <div class="info-item" style="grid-column:span 2;"><span class="info-label">BASIS</span><span class="info-value">${address}</span></div>
      </div>
      <div class="contact-row">
        <div class="contact-item"><i class="fas fa-envelope"></i><span>${email}</span></div>
        <div class="contact-item"><i class="fas fa-phone-alt"></i><span>${phone}</span></div>
      </div>
      <div class="card-footer">
        <div class="hologram"><i class="fas fa-qrcode"></i> ${hologram_text}</div>
        <div class="barcode">
          <span class="thin"></span><span class="wide"></span><span class="medium"></span>
          <span class="thin"></span><span class="wide"></span><span class="thin"></span><span class="medium"></span>
        </div>
        <div class="id-small"><div>ID</div><div class="num">${id_number}</div></div>
      </div>
    </div>
  </div>
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