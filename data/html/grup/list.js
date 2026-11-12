const templates = [{
  html: ({
    sub_title = "PROTOCOL: ENCRYPTED_COMM",
    title_l = "KREATIF",
    title_r = ".LAB",
    version = "WHATSAPP V2.9",
    est = "EST. 2023.01.12",
    users = "1,247",
    u_title = "Active Entities",
    desc_title = "Core mission",
    desc = "Platform akselerasi visual dan pertukaran data kreatif. Dilarang spam, hargai privasi, dan gunakan kanal feedback untuk kolaborasi.",
    tag_a = "NO_ADS",
    tag_b = "PRO_VIBES",
    tag_c = "CREATIVE_ONLY",
    adm_title = "Security Admins",
    adm_name = "@Davi_AI",
    adm_stat = "LEAD",
    cr_name = "@Kreator_X",
    cr_stat = "MOD",
    ds_name = "@Z_Design",
    ds_stat = "MOD",
    act_title = "Activity Load",
    avg_title = "AVG_DAILY",
    avg_count = "72",
    msg_title = "Pesan",
    msg_count = "842",
    file_title = "Files",
    file_count = "124",
    avatar = "https://picsum.photos/seed/cyber/200/200"
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Futuristic WA Group - 1024x512</title>
    
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Orbitron:wght@400;700&family=JetBrains+Mono:wght@300;500&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>

    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        orbitron: ['Orbitron', 'sans-serif'],
                        rajdhani: ['Rajdhani', 'sans-serif'],
                        mono: ['JetBrains Mono', 'monospace'],
                    },
                    colors: {
                        cyber: {
                            cyan: '#00f3ff',
                            pink: '#ff0055',
                            yellow: '#ffee00',
                            blue: '#0066ff'
                        }
                    }
                }
            }
        }
    </script>

    <style>
        body { background: #010208; overflow: hidden; color: #e2e8f0; }
        
        .glass-panel {
            background: rgba(10, 15, 30, 0.7);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(0, 243, 255, 0.15);
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
            position: relative;
            overflow: hidden;
        }

        .glass-panel::before {
            content: '';
            position: absolute;
            top: 0; left: 0; width: 100%; height: 2px;
            background: linear-gradient(90deg, transparent, #00f3ff, transparent);
            opacity: 0.5;
        }

        .scanline {
            width: 100%;
            height: 100px;
            z-index: 50;
            background: linear-gradient(0deg, rgba(0, 243, 255, 0.05) 0%, transparent 100%);
            position: absolute;
            bottom: 100%;
            animation: scan 4s linear infinite;
        }

        @keyframes scan {
            0% { bottom: 100%; }
            100% { bottom: -20%; }
        }

        .neon-text { text-shadow: 0 0 10px rgba(0, 243, 255, 0.5); }
        
        #canvas {
            width: 1024px;
            height: 512px;
            transform-origin: top left;
        }
    </style>
</head>
<body class="flex items-center justify-center min-h-screen">

    <div id="canvas" class="relative p-6 flex flex-col gap-4">
        
        <!-- BG Grid Decoration -->
        <div class="absolute inset-0 opacity-10 pointer-events-none" 
             style="background-image: radial-gradient(#00f3ff 1px, transparent 1px); background-size: 30px 30px;"></div>
        <div class="scanline"></div>

        <!-- TOP ROW: IDENTITY & CORE STATS -->
        <div class="flex gap-4 h-[180px]">
            
            <!-- CARD: IDENTITY (Wider) -->
            <div class="glass-panel flex-[2] rounded-2xl p-6 flex gap-6 items-center">
                <div class="relative">
                    <div class="w-32 h-32 rounded-full border-2 border-cyber-cyan p-1 shadow-[0_0_20px_rgba(0,243,255,0.3)]">
                        <img src="${avatar}" class="w-full h-full rounded-full object-cover grayscale hover:grayscale-0 transition-all duration-500">
                    </div>
                    <div class="absolute -bottom-2 -right-2 bg-cyber-cyan text-black p-2 rounded-lg">
                        <i data-lucide="verified" class="w-5 h-5"></i>
                    </div>
                </div>
                <div>
                    <span class="font-mono text-[10px] text-cyber-cyan tracking-[0.4em] mb-1 block">${sub_title}</span>
                    <h1 class="font-orbitron text-5xl font-bold tracking-tighter neon-text uppercase leading-none mb-2">
                        ${title_l}<span class="text-cyber-cyan">${title_r}</span>
                    </h1>
                    <div class="flex gap-3 mt-4">
                        <span class="bg-cyber-cyan/10 border border-cyber-cyan/30 px-3 py-1 rounded text-[10px] font-mono text-cyber-cyan">${version}</span>
                        <span class="bg-white/5 border border-white/10 px-3 py-1 rounded text-[10px] font-mono text-white/50 italic">${est}</span>
                    </div>
                </div>
            </div>

            <!-- CARD: ACTIVE MEMBERS -->
            <div class="glass-panel flex-1 rounded-2xl p-6 flex flex-col justify-center items-center text-center">
                <i data-lucide="users-2" class="w-8 h-8 text-cyber-cyan mb-2 opacity-50"></i>
                <div class="font-orbitron text-5xl font-bold">${users}</div>
                <div class="font-mono text-[10px] tracking-[0.3em] text-white/30 uppercase mt-2">${u_title}</div>
            </div>

        </div>

        <!-- BOTTOM ROW: THREE EQUAL CARDS -->
        <div class="flex gap-4 flex-1">
            
            <!-- CARD: DESCRIPTION & RULES -->
            <div class="glass-panel flex-[1.5] rounded-2xl p-5 flex flex-col">
                <div class="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
                    <i data-lucide="align-left" class="w-4 h-4 text-cyber-pink"></i>
                    <span class="font-rajdhani font-bold text-xs uppercase tracking-widest text-cyber-pink">${desc_title}</span>
                </div>
                <p class="font-rajdhani text-lg leading-snug text-white/70 italic">
                    ${desc}
                </p>
                <div class="mt-auto flex flex-wrap gap-2">
                    <span class="text-[9px] font-mono border border-white/10 px-2 py-1">${tag_a}</span>
                    <span class="text-[9px] font-mono border border-white/10 px-2 py-1">${tag_b}</span>
                    <span class="text-[9px] font-mono border border-white/10 px-2 py-1">${tag_c}</span>
                </div>
            </div>

            <!-- CARD: ADMINS -->
            <div class="glass-panel flex-1 rounded-2xl p-5">
                <div class="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                    <i data-lucide="shield" class="w-4 h-4 text-cyber-yellow"></i>
                    <span class="font-rajdhani font-bold text-xs uppercase tracking-widest text-cyber-yellow">${adm_title}</span>
                </div>
                <div class="space-y-3">
                    <div class="flex justify-between items-center bg-white/5 p-2 rounded border-l-2 border-cyber-yellow">
                        <span class="font-mono text-xs">${adm_name}</span>
                        <span class="text-[8px] bg-cyber-yellow/20 text-cyber-yellow px-1">${adm_stat}</span>
                    </div>
                    <div class="flex justify-between items-center bg-white/5 p-2 rounded">
                        <span class="font-mono text-xs">${cr_name}</span>
                        <span class="text-[8px] opacity-40">${cr_stat}</span>
                    </div>
                    <div class="flex justify-between items-center bg-white/5 p-2 rounded">
                        <span class="font-mono text-xs">${ds_name}</span>
                        <span class="text-[8px] opacity-40">${ds_stat}</span>
                    </div>
                </div>
            </div>

            <!-- CARD: ACTIVITY ANALYTICS -->
            <div class="glass-panel flex-1 rounded-2xl p-5 flex flex-col">
                <div class="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                    <i data-lucide="bar-chart-3" class="w-4 h-4 text-cyber-blue"></i>
                    <span class="font-rajdhani font-bold text-xs uppercase tracking-widest text-cyber-blue">${act_title}</span>
                </div>
                <div class="flex-1 flex flex-col justify-center">
                    <div class="flex justify-between items-end mb-1">
                        <span class="font-orbitron text-3xl">${avg_count}<span class="text-sm text-cyber-blue">%</span></span>
                        <span class="font-mono text-[9px] text-white/30">${avg_title}</span>
                    </div>
                    <div class="h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                        <div class="h-full w-[${avg_count}%] bg-gradient-to-r from-cyber-blue to-cyber-cyan shadow-[0_0_10px_rgba(0,102,255,0.5)]"></div>
                    </div>
                    <div class="mt-4 flex justify-between text-[10px] font-mono">
                        <div class="text-center">
                            <div class="text-white/40 uppercase">${msg_title}</div>
                            <div class="text-cyber-cyan">${msg_count}/d</div>
                        </div>
                        <div class="text-center">
                            <div class="text-white/40 uppercase">${file_title}</div>
                            <div class="text-cyber-pink">${file_count}/d</div>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <!-- DECORATIVE CORNER FRAME -->
        <div class="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-cyber-cyan opacity-50"></div>
        <div class="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-cyber-cyan opacity-50"></div>
        <div class="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-cyber-cyan opacity-50"></div>
        <div class="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-cyber-cyan opacity-50"></div>
    </div>

    <script>
        // Initialize Lucide Icons
        lucide.createIcons();

        // Responsive Scaling to fit screen while maintaining 1024x512
        function scaleCanvas() {
            const canvas = document.getElementById('canvas');
            const winW = window.innerWidth;
            const winH = window.innerHeight;
            const scale = Math.min(winW / 1024, winH / 512) * 0.95; // 0.95 to give some margin
            canvas.style.transform = 'scale(' + scale + ')';
        }

        window.addEventListener('resize', scaleCanvas);
        scaleCanvas();
    </script>
</body>
</html>`
}, {
  html: ({
    sub_title = "WAVE:// RETRO-CORE",
    title_l = "SYNTH",
    title_r = "WA VE",
    version = "v1.0.8-BETA",
    est = "EST. 1984",
    users = "2.3k",
    u_title = "RIDERS",
    desc_title = "// MISSION //",
    desc = "Relive the golden age of analog creativity. Share retro art, synthwave tracks, and pixel dungeons. Keep the vibes high and the static low.",
    tag_a = "#NEON",
    tag_b = "#SYNTHWAVE",
    tag_c = "#PIXEL",
    adm_title = "STATION MASTERS",
    adm_name = "DJ_ECHO",
    adm_stat = "CAPTAIN",
    cr_name = "PIXEL_PUNK",
    cr_stat = "MOD",
    ds_name = "CRT_HACKER",
    ds_stat = "MOD",
    act_title = "SIGNAL STRENGTH",
    avg_title = "MOON PHASE",
    avg_count = "87",
    msg_title = "CASSETTES",
    msg_count = "312",
    file_title = "FLOPPIES",
    file_count = "56",
    avatar = "https://picsum.photos/seed/retro/200/200"
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Retro Wave WA Group - 1024x512</title>
    
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Orbitron:wght@400;700&family=VT323&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>

    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        'press': ['"Press Start 2P"', 'cursive'],
                        'vt323': ['VT323', 'monospace'],
                        'orbitron': ['Orbitron', 'sans-serif'],
                    },
                    colors: {
                        retro: {
                            pink: '#ff71ce',
                            blue: '#01cdfe',
                            purple: '#b967ff',
                            yellow: '#fffb96',
                            black: '#0d0c1d',
                        }
                    }
                }
            }
        }
    </script>

    <style>
        body { 
            background: #0d0c1d; 
            overflow: hidden; 
            color: #ffffff;
            background-image: 
                linear-gradient(0deg, transparent 24%, rgba(255, 113, 206, 0.1) 25%, rgba(255, 113, 206, 0.1) 26%, transparent 27%, transparent),
                linear-gradient(90deg, transparent 24%, rgba(1, 205, 254, 0.1) 25%, rgba(1, 205, 254, 0.1) 26%, transparent 27%, transparent);
            background-size: 50px 50px;
        }
        
        .retro-panel {
            background: rgba(13, 12, 29, 0.8);
            backdrop-filter: blur(4px);
            border: 2px solid #ff71ce;
            box-shadow: 10px 10px 0 #01cdfe, 0 0 0 2px #b967ff inset;
            position: relative;
        }

        .retro-panel::after {
            content: '';
            position: absolute;
            top: 5px; left: 5px; right: -5px; bottom: -5px;
            background: linear-gradient(45deg, #ff71ce 0%, #01cdfe 100%);
            z-index: -1;
        }

        .glow-text {
            text-shadow: 0 0 5px #ff71ce, 0 0 10px #01cdfe;
        }

        .scanline {
            width: 100%;
            height: 10px;
            background: rgba(255, 113, 206, 0.2);
            position: absolute;
            top: 0;
            animation: scan 6s linear infinite;
        }

        @keyframes scan {
            0% { top: 0; }
            50% { top: 100%; }
            100% { top: 0; }
        }

        #canvas {
            width: 1024px;
            height: 512px;
            transform-origin: top left;
        }

        .grid-overlay {
            background-image: repeating-linear-gradient(0deg, rgba(255, 113, 206, 0.1) 0px, rgba(1, 205, 254, 0.1) 2px, transparent 2px, transparent 10px);
            pointer-events: none;
        }
    </style>
</head>
<body class="flex items-center justify-center min-h-screen">

    <div id="canvas" class="relative p-6 flex gap-4">
        
        <!-- Animated scanline -->
        <div class="scanline"></div>

        <!-- LEFT SPLIT: VERTICAL GROUP INFO -->
        <div class="w-[45%] h-full flex flex-col gap-4">
            
            <!-- Avatar + Title -->
            <div class="retro-panel p-4 flex-1 flex flex-col items-center justify-center">
                <div class="w-28 h-28 border-4 border-retro-blue mb-3 relative">
                    <img src="${avatar}" class="w-full h-full object-cover">
                    <div class="absolute -top-3 -right-3 w-8 h-8 bg-retro-yellow rounded-full flex items-center justify-center text-retro-black text-xs">✓</div>
                </div>
                <span class="font-vt323 text-retro-pink tracking-widest text-xl">${sub_title}</span>
                <h1 class="font-press text-3xl my-2 leading-tight text-center glow-text">
                    ${title_l}<span class="text-retro-blue">${title_r}</span>
                </h1>
                <div class="flex gap-2 mt-2">
                    <span class="font-vt323 bg-retro-pink text-retro-black px-3 py-1 text-sm">${version}</span>
                    <span class="font-vt323 border-2 border-retro-yellow px-3 py-1 text-sm">${est}</span>
                </div>
            </div>

            <!-- Tags / Rules -->
            <div class="retro-panel p-4 flex-1">
                <div class="font-press text-xs text-retro-yellow mb-3">${desc_title}</div>
                <p class="font-vt323 text-lg text-white/90 leading-relaxed">${desc}</p>
                <div class="flex gap-2 mt-3 flex-wrap">
                    <span class="bg-retro-purple px-2 py-1 text-[9px] font-press">${tag_a}</span>
                    <span class="bg-retro-blue px-2 py-1 text-[9px] font-press">${tag_b}</span>
                    <span class="bg-retro-pink px-2 py-1 text-[9px] font-press">${tag_c}</span>
                </div>
            </div>
        </div>

        <!-- RIGHT SPLIT: STATS AND ADMINS -->
        <div class="w-[55%] h-full flex flex-col gap-4">

            <!-- Active Users Card -->
            <div class="retro-panel p-4 flex-1 flex flex-col">
                <div class="flex justify-between items-center border-b-2 border-retro-blue pb-2 mb-3">
                    <span class="font-press text-xs text-retro-blue">${u_title}</span>
                    <i data-lucide="users" class="w-5 h-5 text-retro-yellow"></i>
                </div>
                <div class="flex items-end justify-between">
                    <span class="font-press text-5xl glow-text">${users}</span>
                    <span class="font-vt323 text-2xl text-retro-pink">online</span>
                </div>
                <!-- tiny bar graph -->
                <div class="mt-auto grid grid-cols-5 gap-1 h-12 items-end">
                    <div class="bg-retro-pink h-6"></div>
                    <div class="bg-retro-blue h-8"></div>
                    <div class="bg-retro-yellow h-10"></div>
                    <div class="bg-retro-pink h-7"></div>
                    <div class="bg-retro-blue h-5"></div>
                </div>
            </div>

            <!-- Admins + Activity combined -->
            <div class="flex gap-4 flex-1">
                
                <!-- Admins -->
                <div class="retro-panel p-4 w-1/2 flex flex-col">
                    <div class="flex items-center gap-2 border-b-2 border-retro-yellow pb-2 mb-3">
                        <i data-lucide="shield" class="w-4 h-4 text-retro-yellow"></i>
                        <span class="font-press text-xs text-retro-yellow">${adm_title}</span>
                    </div>
                    <div class="space-y-2">
                        <div class="flex justify-between bg-retro-black/50 p-2 border-l-4 border-retro-pink">
                            <span class="font-vt323 text-sm">${adm_name}</span>
                            <span class="font-press text-[8px] text-retro-pink">${adm_stat}</span>
                        </div>
                        <div class="flex justify-between bg-retro-black/50 p-2">
                            <span class="font-vt323 text-sm">${cr_name}</span>
                            <span class="font-press text-[8px] text-white/50">${cr_stat}</span>
                        </div>
                        <div class="flex justify-between bg-retro-black/50 p-2">
                            <span class="font-vt323 text-sm">${ds_name}</span>
                            <span class="font-press text-[8px] text-white/50">${ds_stat}</span>
                        </div>
                    </div>
                </div>

                <!-- Activity -->
                <div class="retro-panel p-4 w-1/2 flex flex-col">
                    <div class="flex items-center gap-2 border-b-2 border-retro-purple pb-2 mb-3">
                        <i data-lucide="activity" class="w-4 h-4 text-retro-purple"></i>
                        <span class="font-press text-xs text-retro-purple">${act_title}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="font-press text-3xl">${avg_count}<span class="text-sm text-retro-blue">%</span></span>
                        <span class="font-vt323 text-lg">${avg_title}</span>
                    </div>
                    <div class="h-3 w-full bg-retro-black/70 my-2 border-2 border-retro-blue">
                        <div class="h-full w-[${avg_count}%] bg-retro-pink"></div>
                    </div>
                    <div class="flex justify-between mt-2 text-center">
                        <div>
                            <div class="font-press text-[8px] text-retro-yellow">${msg_title}</div>
                            <div class="font-vt323 text-xl">${msg_count}</div>
                        </div>
                        <div>
                            <div class="font-press text-[8px] text-retro-blue">${file_title}</div>
                            <div class="font-vt323 text-xl">${file_count}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Decorative grid overlay -->
        <div class="absolute inset-0 grid-overlay pointer-events-none"></div>
    </div>

    <script>
        lucide.createIcons();

        function scaleCanvas() {
            const canvas = document.getElementById('canvas');
            const winW = window.innerWidth;
            const winH = window.innerHeight;
            const scale = Math.min(winW / 1024, winH / 512) * 0.95;
            canvas.style.transform = 'scale(' + scale + ')';
        }

        window.addEventListener('resize', scaleCanvas);
        scaleCanvas();
    </script>
</body>
</html>`
}, {
  html: ({
    sub_title = "// NEOTOKYO: DISTRICT 9 //",
    title_l = "CYBER",
    title_r = "STREETS",
    version = "EDGE v2.0",
    est = "EST. 2049",
    users = "4.5k",
    u_title = "Citizens",
    desc_title = "GRID CODE",
    desc = "Selamat datang di distrik digital Neo Tokyo. Bagikan karya seni neon, musik cyberpunk, dan teknologi implan. Hormati sesama netrunner dan jaga perdamaian.",
    tag_a = "#CYBERPUNK",
    tag_b = "#NEON",
    tag_c = "#AI",
    adm_title = "Netrunners",
    adm_name = "ZERO_COOL",
    adm_stat = "LEAD",
    cr_name = "MOTO_K",
    cr_stat = "MOD",
    ds_name = "JUNKER",
    ds_stat = "MOD",
    act_title = "NEON INTENSITY",
    avg_title = "SIGNAL",
    avg_count = "92",
    msg_title = "PACKETS",
    msg_count = "1.2k",
    file_title = "GIGS",
    file_count = "389",
    avatar = "https://picsum.photos/seed/neotokyo/200/200"
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Neo Tokyo WA Group - 1024x512</title>
    
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;500;700&family=Zen+Dots&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>

    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        'orbitron': ['Orbitron', 'sans-serif'],
                        'rajdhani': ['Rajdhani', 'sans-serif'],
                        'zen': ['Zen Dots', 'cursive'],
                    },
                    colors: {
                        neo: {
                            red: '#ff0040',
                            cyan: '#00ffff',
                            purple: '#aa00ff',
                            yellow: '#ffff00',
                        }
                    }
                }
            }
        }
    </script>

    <style>
        body { 
            background: #0a0a0f; 
            overflow: hidden; 
            color: #e0e0ff;
            background-image: 
                linear-gradient(#ff0040 1px, transparent 1px),
                linear-gradient(90deg, #00ffff 1px, transparent 1px);
            background-size: 40px 40px;
            background-position: center center;
        }
        
        .cyber-panel {
            background: rgba(10, 10, 20, 0.7);
            backdrop-filter: blur(12px);
            border: 2px solid #ff0040;
            box-shadow: 0 0 20px rgba(255, 0, 64, 0.5), inset 0 0 10px rgba(0, 255, 255, 0.3);
            position: relative;
            overflow: hidden;
        }

        .cyber-panel::before {
            content: '';
            position: absolute;
            top: -2px; left: -2px; width: calc(100% + 4px); height: calc(100% + 4px);
            background: linear-gradient(45deg, transparent 40%, #00ffff, transparent 60%);
            opacity: 0.1;
            animation: glitch 3s infinite;
        }

        @keyframes glitch {
            0% { transform: translate(0); }
            20% { transform: translate(-2px, 2px); }
            40% { transform: translate(2px, -2px); }
            60% { transform: translate(-2px, -2px); }
            80% { transform: translate(2px, 2px); }
            100% { transform: translate(0); }
        }

        .neon-line {
            height: 3px;
            background: linear-gradient(90deg, transparent, #ff0040, #00ffff, #aa00ff, transparent);
            filter: blur(1px);
        }

        .hologram {
            text-shadow: 0 0 5px #00ffff, 0 0 10px #ff0040, 0 0 20px #aa00ff;
        }

        #canvas {
            width: 1024px;
            height: 512px;
            transform-origin: top left;
        }
    </style>
</head>
<body class="flex items-center justify-center min-h-screen">

    <div id="canvas" class="relative p-5 flex flex-col gap-4">

        <!-- floating particles (simple divs) -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none">
            <div class="absolute w-1 h-1 bg-neo-red rounded-full top-10 left-20 animate-ping"></div>
            <div class="absolute w-1 h-1 bg-neo-cyan rounded-full top-40 right-32 animate-pulse"></div>
            <div class="absolute w-1 h-1 bg-neo-purple rounded-full bottom-20 left-60 animate-bounce"></div>
        </div>

        <!-- HEADER: Title + Version -->
        <div class="flex justify-between items-center border-b-2 border-neo-red pb-2">
            <div>
                <span class="font-zen text-neo-cyan text-sm tracking-[0.3em]">${sub_title}</span>
                <h1 class="font-orbitron text-5xl font-black hologram">
                    ${title_l}<span class="text-neo-red">${title_r}</span>
                </h1>
            </div>
            <div class="text-right">
                <span class="bg-neo-red/20 px-4 py-2 rounded-sm font-mono text-sm border border-neo-red">${version}</span>
                <div class="font-rajdhani text-neo-purple mt-1">${est}</div>
            </div>
        </div>

        <!-- MAIN CONTENT: 3 Kolom -->
        <div class="flex gap-4 flex-1">
            
            <!-- Kolom 1: Avatar + Deskripsi + Tags -->
            <div class="cyber-panel flex-1 rounded-sm p-4 flex flex-col">
                <div class="flex items-center gap-4 mb-4">
                    <div class="w-20 h-20 rounded-full border-4 border-neo-cyan overflow-hidden shadow-[0_0_15px_#00ffff]">
                        <img src="${avatar}" class="w-full h-full object-cover">
                    </div>
                    <div>
                        <div class="font-orbitron text-2xl">${users}</div>
                        <div class="font-rajdhani text-neo-cyan uppercase text-xs">${u_title}</div>
                    </div>
                </div>
                <div class="neon-line w-full mb-3"></div>
                <div class="font-rajdhani font-bold text-neo-purple text-sm mb-2">${desc_title}</div>
                <p class="font-rajdhani text-sm leading-relaxed text-white/80 flex-1">
                    ${desc}
                </p>
                <div class="flex flex-wrap gap-2 mt-3">
                    <span class="border border-neo-red px-3 py-1 text-[10px] font-mono text-neo-red">${tag_a}</span>
                    <span class="border border-neo-cyan px-3 py-1 text-[10px] font-mono text-neo-cyan">${tag_b}</span>
                    <span class="border border-neo-purple px-3 py-1 text-[10px] font-mono text-neo-purple">${tag_c}</span>
                </div>
            </div>

            <!-- Kolom 2: Admins -->
            <div class="cyber-panel flex-1 rounded-sm p-4 flex flex-col">
                <div class="flex items-center gap-2 border-b border-neo-red pb-2 mb-4">
                    <i data-lucide="cpu" class="w-5 h-5 text-neo-yellow"></i>
                    <span class="font-orbitron text-xs tracking-widest text-neo-yellow">${adm_title}</span>
                </div>
                <div class="space-y-3 flex-1">
                    <div class="flex justify-between items-center bg-white/5 p-2 border-l-4 border-neo-red">
                        <span class="font-mono text-sm">${adm_name}</span>
                        <span class="text-[9px] bg-neo-red/20 text-neo-red px-1">${adm_stat}</span>
                    </div>
                    <div class="flex justify-between items-center bg-white/5 p-2 border-l-4 border-neo-cyan">
                        <span class="font-mono text-sm">${cr_name}</span>
                        <span class="text-[9px] bg-neo-cyan/20 text-neo-cyan px-1">${cr_stat}</span>
                    </div>
                    <div class="flex justify-between items-center bg-white/5 p-2 border-l-4 border-neo-purple">
                        <span class="font-mono text-sm">${ds_name}</span>
                        <span class="text-[9px] bg-neo-purple/20 text-neo-purple px-1">${ds_stat}</span>
                    </div>
                </div>
            </div>

            <!-- Kolom 3: Activity & Stats -->
            <div class="cyber-panel flex-1 rounded-sm p-4 flex flex-col">
                <div class="flex items-center gap-2 border-b border-neo-purple pb-2 mb-4">
                    <i data-lucide="gauge" class="w-5 h-5 text-neo-cyan"></i>
                    <span class="font-orbitron text-xs tracking-widest text-neo-cyan">${act_title}</span>
                </div>
                <div class="flex-1 flex flex-col justify-around">
                    <div>
                        <div class="flex justify-between items-center">
                            <span class="font-orbitron text-4xl">${avg_count}<span class="text-neo-red text-xl">%</span></span>
                            <span class="font-rajdhani text-neo-cyan text-sm">${avg_title}</span>
                        </div>
                        <div class="h-2 bg-black/50 mt-1 border border-neo-red">
                            <div class="h-full w-[${avg_count}%] bg-gradient-to-r from-neo-red to-neo-cyan"></div>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-center mt-3">
                        <div class="border border-neo-cyan/30 p-2">
                            <div class="font-rajdhani text-xs text-neo-cyan">${msg_title}</div>
                            <div class="font-orbitron text-lg">${msg_count}</div>
                        </div>
                        <div class="border border-neo-purple/30 p-2">
                            <div class="font-rajdhani text-xs text-neo-purple">${file_title}</div>
                            <div class="font-orbitron text-lg">${file_count}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Decorative bottom line -->
        <div class="neon-line w-full"></div>
        <div class="absolute bottom-2 right-4 font-zen text-[8px] text-neo-cyan opacity-50">© NEOTOKYO // GRID v1.0</div>
    </div>

    <script>
        lucide.createIcons();

        function scaleCanvas() {
            const canvas = document.getElementById('canvas');
            const winW = window.innerWidth;
            const winH = window.innerHeight;
            const scale = Math.min(winW / 1024, winH / 512) * 0.95;
            canvas.style.transform = 'scale(' + scale + ')';
        }

        window.addEventListener('resize', scaleCanvas);
        scaleCanvas();
    </script>
</body>
</html>`
}, {
  html: ({
    sub_title = "OFFICIAL COMMUNITY",
    title_l = "CREATIVE",
    title_r = "HUB",
    version = "v3.0.1",
    est = "EST. 2024",
    users = "3.2k",
    u_title = "MEMBERS",
    desc_title = "ABOUT",
    desc = "A place for creators to share, collaborate, and grow. We value respectful communication and high-quality content.",
    tag_a = "#CREATIVE",
    tag_b = "#COLLAB",
    tag_c = "#RESPECT",
    adm_title = "MODERATORS",
    adm_name = "@alex",
    adm_stat = "ADMIN",
    cr_name = "@jordan",
    cr_stat = "MOD",
    ds_name = "@casey",
    ds_stat = "MOD",
    act_title = "ENGAGEMENT",
    avg_title = "DAILY ACTIVE",
    avg_count = "78",
    msg_title = "MESSAGES",
    msg_count = "943",
    file_title = "UPLOADS",
    file_count = "215",
    avatar = "https://picsum.photos/seed/clean/200/200"
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Clean Modern WA Group - 1024x512</title>
    
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>

    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    },
                    colors: {
                        primary: '#3b82f6',
                        secondary: '#8b5cf6',
                        accent: '#ec4899',
                    }
                }
            }
        }
    </script>

    <style>
        body { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            overflow: hidden; 
            font-family: 'Inter', sans-serif;
        }
        
        .glass-card {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.5);
        }

        .stat-card {
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02);
            border: 1px solid #f0f0f0;
        }

        .progress-bar {
            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
            border-radius: 999px;
            height: 8px;
        }

        #canvas {
            width: 1024px;
            height: 512px;
            transform-origin: top left;
        }

        /* subtle pattern */
        .bg-pattern {
            background-image: radial-gradient(circle at 1px 1px, rgba(0,0,0,0.02) 1px, transparent 0);
            background-size: 20px 20px;
        }
    </style>
</head>
<body class="flex items-center justify-center min-h-screen bg-pattern">

    <div id="canvas" class="relative p-6">
        <!-- main container with white/glass background -->
        <div class="glass-card w-full h-full p-6 flex flex-col gap-4 relative overflow-hidden">
            
            <!-- Header with title and metadata -->
            <div class="flex justify-between items-start">
                <div>
                    <div class="text-sm font-semibold text-gray-500 uppercase tracking-wider">${sub_title}</div>
                    <h1 class="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        ${title_l}<span class="text-gray-900">${title_r}</span>
                    </h1>
                </div>
                <div class="flex gap-2 items-center">
                    <span class="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">${version}</span>
                    <span class="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">${est}</span>
                </div>
            </div>

            <!-- Main content: two columns -->
            <div class="flex gap-4 flex-1">
                <!-- Left column: Avatar, description, tags -->
                <div class="w-2/5 flex flex-col gap-3">
                    <div class="flex items-center gap-4">
                        <div class="w-24 h-24 rounded-2xl overflow-hidden shadow-lg border-4 border-white">
                            <img src="${avatar}" class="w-full h-full object-cover">
                        </div>
                        <div>
                            <div class="text-3xl font-bold text-gray-800">${users}</div>
                            <div class="text-sm text-gray-500">${u_title}</div>
                        </div>
                    </div>
                    <div class="stat-card p-4 flex-1">
                        <div class="font-semibold text-gray-700 mb-2 flex items-center gap-1">
                            <i data-lucide="info" class="w-4 h-4 text-primary"></i> ${desc_title}
                        </div>
                        <p class="text-sm text-gray-600 leading-relaxed">${desc}</p>
                        <div class="flex flex-wrap gap-2 mt-3">
                            <span class="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium">${tag_a}</span>
                            <span class="px-2 py-1 bg-secondary/10 text-secondary rounded-md text-xs font-medium">${tag_b}</span>
                            <span class="px-2 py-1 bg-accent/10 text-accent rounded-md text-xs font-medium">${tag_c}</span>
                        </div>
                    </div>
                </div>

                <!-- Right column: Admins and stats -->
                <div class="w-3/5 flex flex-col gap-3">
                    <!-- Admins row -->
                    <div class="stat-card p-4">
                        <div class="font-semibold text-gray-700 mb-3 flex items-center gap-1">
                            <i data-lucide="shield" class="w-4 h-4 text-secondary"></i> ${adm_title}
                        </div>
                        <div class="grid grid-cols-3 gap-2">
                            <div class="bg-gray-50 p-2 rounded-lg text-center">
                                <div class="font-medium text-sm">${adm_name}</div>
                                <div class="text-[10px] text-primary font-semibold">${adm_stat}</div>
                            </div>
                            <div class="bg-gray-50 p-2 rounded-lg text-center">
                                <div class="font-medium text-sm">${cr_name}</div>
                                <div class="text-[10px] text-gray-500">${cr_stat}</div>
                            </div>
                            <div class="bg-gray-50 p-2 rounded-lg text-center">
                                <div class="font-medium text-sm">${ds_name}</div>
                                <div class="text-[10px] text-gray-500">${ds_stat}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Activity stats -->
                    <div class="stat-card p-4 flex-1">
                        <div class="font-semibold text-gray-700 mb-3 flex items-center gap-1">
                            <i data-lucide="bar-chart-2" class="w-4 h-4 text-accent"></i> ${act_title}
                        </div>
                        <div class="flex items-end justify-between mb-2">
                            <span class="text-3xl font-bold text-gray-800">${avg_count}<span class="text-sm text-gray-400">%</span></span>
                            <span class="text-sm text-gray-500">${avg_title}</span>
                        </div>
                        <div class="w-full bg-gray-100 rounded-full h-2 mb-4">
                            <div class="progress-bar" style="width: ${avg_count}%"></div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div class="bg-gray-50 p-3 rounded-xl text-center">
                                <div class="text-xs text-gray-500">${msg_title}</div>
                                <div class="text-xl font-bold text-primary">${msg_count}</div>
                            </div>
                            <div class="bg-gray-50 p-3 rounded-xl text-center">
                                <div class="text-xs text-gray-500">${file_title}</div>
                                <div class="text-xl font-bold text-secondary">${file_count}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- subtle decorative line -->
            <div class="absolute bottom-3 right-6 text-[10px] text-gray-300">clean design // modern hub</div>
        </div>
    </div>

    <script>
        lucide.createIcons();

        function scaleCanvas() {
            const canvas = document.getElementById('canvas');
            const winW = window.innerWidth;
            const winH = window.innerHeight;
            const scale = Math.min(winW / 1024, winH / 512) * 0.95;
            canvas.style.transform = 'scale(' + scale + ')';
        }

        window.addEventListener('resize', scaleCanvas);
        scaleCanvas();
    </script>
</body>
</html>`
}, {
  html: ({
    sub_title = "★ INTERSTELLAR COMM ★",
    title_l = "GALAXY",
    title_r = "HUB",
    version = "NEBULA v4.2",
    est = "EST. 3024",
    users = "9.4k",
    u_title = "EXPLORERS",
    desc_title = "MISSION LOG",
    desc = "Menjelajahi galaksi kreativitas tanpa batas. Berbagi karya seni cosmic, musik ambient, dan diskusi tentang alam semesta. Jaga perdamaian antar galaksi.",
    tag_a = "#COSMIC",
    tag_b = "#NEBULA",
    tag_c = "#STARDUST",
    adm_title = "COSMIC COUNCIL",
    adm_name = "ORION",
    adm_stat = "COMMANDER",
    cr_name = "ANDROMEDA",
    cr_stat = "NAVIGATOR",
    ds_name = "SIRIUS",
    ds_stat = "SCIENTIST",
    act_title = "STELLAR ACTIVITY",
    avg_title = "SOLAR FLARE",
    avg_count = "63",
    msg_title = "LIGHT YEARS",
    msg_count = "2.1k",
    file_title = "NEBULAE",
    file_count = "457",
    avatar = "https://picsum.photos/seed/galaxy/200/200"
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Galaxy WA Group - 1024x512</title>
    
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;500;700&family=Space+Mono&family=Astloch:wght@400;700&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>

    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        'space': ['Space Grotesk', 'sans-serif'],
                        'mono': ['Space Mono', 'monospace'],
                    },
                    colors: {
                        cosmic: {
                            purple: '#6b21a8',
                            blue: '#1e3a8a',
                            pink: '#be185d',
                            gold: '#b45309',
                        }
                    }
                }
            }
        }
    </script>

    <style>
        body { 
            background: #0a0c10; 
            overflow: hidden; 
            color: #f0f9ff;
            background-image: radial-gradient(white 1px, transparent 1px);
            background-size: 50px 50px;
        }
        
        .galaxy-panel {
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 215, 0, 0.3);
            box-shadow: 0 0 30px rgba(147, 51, 234, 0.3), inset 0 0 20px rgba(245, 158, 11, 0.2);
            border-radius: 30px;
            position: relative;
            overflow: hidden;
        }

        .galaxy-panel::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: radial-gradient(circle at 30% 50%, rgba(147, 51, 234, 0.2), transparent 60%);
            pointer-events: none;
        }

        .star {
            position: absolute;
            background: white;
            border-radius: 50%;
            box-shadow: 0 0 10px white;
            animation: twinkle 2s infinite ease-in-out;
        }

        @keyframes twinkle {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }

        .planet-glow {
            filter: drop-shadow(0 0 15px #fbbf24);
        }

        #canvas {
            width: 1024px;
            height: 512px;
            transform-origin: top left;
        }
    </style>
</head>
<body class="flex items-center justify-center min-h-screen">

    <div id="canvas" class="relative p-6">
        <!-- stars background (dynamic) -->
        <div id="stars" class="absolute inset-0 overflow-hidden pointer-events-none"></div>

        <!-- main panel -->
        <div class="galaxy-panel w-full h-full p-6 flex flex-col gap-4 relative z-10">
            
            <!-- Header with orbit lines -->
            <div class="flex justify-between items-start border-b border-cosmic-gold/30 pb-3">
                <div>
                    <span class="font-mono text-cosmic-gold text-xs tracking-[0.3em]">${sub_title}</span>
                    <h1 class="font-space text-5xl font-bold">
                        <span class="text-transparent bg-clip-text bg-gradient-to-r from-cosmic-pink to-cosmic-gold">${title_l}</span>
                        <span class="text-white">${title_r}</span>
                    </h1>
                </div>
                <div class="flex gap-3">
                    <span class="border border-cosmic-blue px-3 py-1 rounded-full text-xs bg-cosmic-blue/20">${version}</span>
                    <span class="border border-cosmic-purple px-3 py-1 rounded-full text-xs bg-cosmic-purple/20">${est}</span>
                </div>
            </div>

            <!-- 3 kolom utama -->
            <div class="flex gap-4 flex-1">
                
                <!-- Kolom 1: Avatar dan Deskripsi -->
                <div class="flex-1 flex flex-col gap-3">
                    <div class="flex items-center gap-4 bg-black/40 p-3 rounded-2xl border border-cosmic-gold/20">
                        <div class="w-20 h-20 rounded-full overflow-hidden border-2 border-cosmic-gold planet-glow">
                            <img src="${avatar}" class="w-full h-full object-cover">
                        </div>
                        <div>
                            <div class="text-3xl font-space font-bold text-cosmic-gold">${users}</div>
                            <div class="text-xs text-gray-400">${u_title}</div>
                        </div>
                    </div>
                    <div class="bg-black/40 p-4 rounded-2xl border border-cosmic-blue/20 flex-1">
                        <div class="font-space font-bold text-cosmic-blue mb-2 flex items-center gap-1">
                            <i data-lucide="scroll-text" class="w-4 h-4"></i> ${desc_title}
                        </div>
                        <p class="text-sm text-gray-300 leading-relaxed">${desc}</p>
                        <div class="flex flex-wrap gap-2 mt-4">
                            <span class="border border-cosmic-pink px-3 py-1 rounded-full text-[10px]">${tag_a}</span>
                            <span class="border border-cosmic-blue px-3 py-1 rounded-full text-[10px]">${tag_b}</span>
                            <span class="border border-cosmic-gold px-3 py-1 rounded-full text-[10px]">${tag_c}</span>
                        </div>
                    </div>
                </div>

                <!-- Kolom 2: Admins -->
                <div class="flex-1 bg-black/40 p-4 rounded-2xl border border-cosmic-purple/20 flex flex-col">
                    <div class="font-space font-bold text-cosmic-purple mb-4 flex items-center gap-1">
                        <i data-lucide="stars" class="w-5 h-5"></i> ${adm_title}
                    </div>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center border-b border-cosmic-gold/20 pb-2">
                            <span class="font-mono">${adm_name}</span>
                            <span class="text-[10px] bg-cosmic-purple/30 px-2 py-0.5 rounded-full">${adm_stat}</span>
                        </div>
                        <div class="flex justify-between items-center border-b border-cosmic-gold/20 pb-2">
                            <span class="font-mono">${cr_name}</span>
                            <span class="text-[10px] bg-cosmic-blue/30 px-2 py-0.5 rounded-full">${cr_stat}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="font-mono">${ds_name}</span>
                            <span class="text-[10px] bg-cosmic-pink/30 px-2 py-0.5 rounded-full">${ds_stat}</span>
                        </div>
                    </div>
                </div>

                <!-- Kolom 3: Activity -->
                <div class="flex-1 bg-black/40 p-4 rounded-2xl border border-cosmic-gold/20 flex flex-col">
                    <div class="font-space font-bold text-cosmic-gold mb-4 flex items-center gap-1">
                        <i data-lucide="orbit" class="w-5 h-5"></i> ${act_title}
                    </div>
                    <div>
                        <div class="flex justify-between items-center">
                            <span class="font-space text-4xl text-cosmic-gold">${avg_count}<span class="text-sm text-gray-400">%</span></span>
                            <span class="text-xs text-cosmic-blue">${avg_title}</span>
                        </div>
                        <div class="h-2 bg-gray-700 rounded-full mt-2 overflow-hidden">
                            <div class="h-full bg-gradient-to-r from-cosmic-blue to-cosmic-pink" style="width: ${avg_count}%"></div>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2 mt-6">
                        <div class="text-center border border-cosmic-blue/30 p-2 rounded-xl">
                            <div class="text-xs text-cosmic-blue">${msg_title}</div>
                            <div class="font-space text-xl">${msg_count}</div>
                        </div>
                        <div class="text-center border border-cosmic-pink/30 p-2 rounded-xl">
                            <div class="text-xs text-cosmic-pink">${file_title}</div>
                            <div class="font-space text-xl">${file_count}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- decorative planet -->
            <div class="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-r from-cosmic-purple to-cosmic-pink opacity-20 blur-3xl"></div>
        </div>
    </div>

    <script>
        // Generate stars
        function createStars() {
            const starsContainer = document.getElementById('stars');
            for (let i = 0; i < 100; i++) {
                const star = document.createElement('div');
                star.className = 'star';
                const size = Math.random() * 3;
                star.style.width = size + 'px';
                star.style.height = size + 'px';
                star.style.left = Math.random() * 100 + '%';
                star.style.top = Math.random() * 100 + '%';
                star.style.animationDelay = Math.random() * 3 + 's';
                starsContainer.appendChild(star);
            }
        }
        createStars();

        lucide.createIcons();

        function scaleCanvas() {
            const canvas = document.getElementById('canvas');
            const winW = window.innerWidth;
            const winH = window.innerHeight;
            const scale = Math.min(winW / 1024, winH / 512) * 0.95;
            canvas.style.transform = 'scale(' + scale + ')';
        }

        window.addEventListener('resize', scaleCanvas);
        scaleCanvas();
    </script>
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