const templates = [{
  html: ({
    top,
    bottom,
    url
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meme Generator</title>
    <link href="https://fonts.googleapis.com/css2?family=Titillium+Web:wght@900&display=swap" rel="stylesheet">
    <style>
        * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
            font-family: 'Titillium Web', sans-serif; 
        }
        
        body { 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            background: black; 
            overflow: hidden; 
        }

        .meme-container { 
            position: absolute;
            inset: 0; /* Memastikan elemen mengisi seluruh layar */
            display: flex; 
            justify-content: center; 
            align-items: center; 
            overflow: hidden; 
        }

        .meme-container img { 
            width: 100vw; 
            height: 100vh; 
            object-fit: cover; /* Crop otomatis agar gambar mengisi layar */
            object-position: center; 
        }

        .meme-text { 
            position: absolute; 
            width: 90%; 
            text-align: center; 
            color: white; 
            font-weight: 900; 
            text-shadow: 2px 2px 4px black; 
            -webkit-text-stroke: 2px black;
            letter-spacing: 1px;
            padding: 10px; 
            line-height: 1.2; 
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        .top-text { 
            top: 5%; 
            font-size: min(8vw, 10vh); /* Ukuran responsif */
        }

        .bottom-text { 
            bottom: 5%; 
            font-size: min(8vw, 10vh); /* Ukuran responsif */
        }
    </style>
</head>
<body>
    <div class="meme-container">
        <img src="${url}" alt="Meme">
        <div class="meme-text top-text">${top}</div>
        <div class="meme-text bottom-text">${bottom}</div>
    </div>
</body>
</html>`
}, {
  html: ({
    top,
    bottom,
    url
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meme Generator</title>
    <link href="https://fonts.googleapis.com/css2?family=Titillium+Web:wght@900&family=Anton&family=Bebas+Neue&family=Oswald:wght@700&display=swap" rel="stylesheet">
    <style>
        * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
            font-family: 'Anton', sans-serif; 
        }
        
        body { 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            background: black; 
            overflow: hidden; 
        }

        .meme-container { 
            position: absolute;
            inset: 0;
            display: flex; 
            justify-content: center; 
            align-items: center; 
            overflow: hidden; 
        }

        .meme-container img { 
            width: 100vw; 
            height: 100vh; 
            object-fit: cover;
            object-position: center; 
            filter: brightness(0.9);
        }

        .meme-text { 
            position: absolute; 
            width: 90%; 
            text-align: center; 
            color: white; 
            font-weight: 900; 
            letter-spacing: 2px;
            padding: 15px 25px; 
            line-height: 1.2; 
            word-wrap: break-word;
            overflow-wrap: break-word;
            
            /* Efek Glass Transparan */
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border-radius: 15px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 
                0 8px 32px rgba(0, 0, 0, 0.3),
                inset 0 1px 0 rgba(255, 255, 255, 0.1);
            
            /* Efek teks */
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 20px rgba(255, 255, 255, 0.3);
            -webkit-text-stroke: 1.5px rgba(0, 0, 0, 0.7);
        }

        .top-text { 
            top: 5%; 
            font-size: min(7vw, 9vh);
        }

        .bottom-text { 
            bottom: 5%; 
            font-size: min(7vw, 9vh);
        }
    </style>
</head>
<body>
    <div class="meme-container">
        <img src="${url}" alt="Meme">
        <div class="meme-text top-text">${top}</div>
        <div class="meme-text bottom-text">${bottom}</div>
    </div>
</body>
</html>`
}, {
  html: ({
    top,
    bottom,
    url
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meme Generator</title>
    <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Rajdhani:wght@700&family=Orbitron:wght@900&display=swap" rel="stylesheet">
    <style>
        * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
            font-family: 'Orbitron', 'Bebas Neue', sans-serif; 
        }
        
        body { 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            background: #000; 
            overflow: hidden; 
        }

        .meme-container { 
            position: absolute;
            inset: 0;
            display: flex; 
            justify-content: center; 
            align-items: center; 
            overflow: hidden; 
        }

        .meme-container img { 
            width: 100vw; 
            height: 100vh; 
            object-fit: cover;
            object-position: center; 
        }

        .meme-text { 
            position: absolute; 
            width: 90%; 
            text-align: center; 
            color: #00ffea; 
            font-weight: 900; 
            letter-spacing: 3px;
            padding: 20px 30px; 
            line-height: 1.2; 
            word-wrap: break-word;
            overflow-wrap: break-word;
            
            /* Efek Glass Neon */
            background: rgba(0, 255, 234, 0.1);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border-radius: 12px;
            border: 2px solid rgba(0, 255, 234, 0.3);
            
            /* Efek Glow Neon */
            text-shadow: 
                0 0 5px #fff,
                0 0 10px #fff,
                0 0 15px #fff,
                0 0 20px #00ffea,
                0 0 30px #00ffea,
                0 0 40px #00ffea;
            box-shadow: 
                0 0 20px rgba(0, 255, 234, 0.5),
                inset 0 0 20px rgba(0, 255, 234, 0.2);
        }

        .top-text { 
            top: 5%; 
            font-size: min(7vw, 9vh);
        }

        .bottom-text { 
            bottom: 5%; 
            font-size: min(7vw, 9vh);
        }
    </style>
</head>
<body>
    <div class="meme-container">
        <img src="${url}" alt="Meme">
        <div class="meme-text top-text">${top}</div>
        <div class="meme-text bottom-text">${bottom}</div>
    </div>
</body>
</html>`
}, {
  html: ({
    top,
    bottom,
    url
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meme Generator</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@800&family=Poppins:wght@900&family=Raleway:wght@900&display=swap" rel="stylesheet">
    <style>
        * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
            font-family: 'Montserrat', sans-serif; 
        }
        
        body { 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            background: #0a0a0a; 
            overflow: hidden; 
        }

        .meme-container { 
            position: absolute;
            inset: 0;
            display: flex; 
            justify-content: center; 
            align-items: center; 
            overflow: hidden; 
        }

        .meme-container img { 
            width: 100vw; 
            height: 100vh; 
            object-fit: cover;
            object-position: center; 
            filter: contrast(1.1) saturate(1.1);
        }

        .meme-text { 
            position: absolute; 
            width: 90%; 
            text-align: center; 
            color: #ffffff; 
            font-weight: 800; 
            letter-spacing: 1px;
            padding: 25px 35px; 
            line-height: 1.3; 
            word-wrap: break-word;
            overflow-wrap: break-word;
            
            /* Efek Glass Elegant */
            background: linear-gradient(
                135deg,
                rgba(255, 255, 255, 0.1),
                rgba(255, 255, 255, 0.05)
            );
            backdrop-filter: blur(15px) saturate(180%);
            -webkit-backdrop-filter: blur(15px) saturate(180%);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            
            /* Efek teks halus */
            text-shadow: 
                0 2px 10px rgba(0, 0, 0, 0.5),
                0 4px 20px rgba(0, 0, 0, 0.3);
            -webkit-text-stroke: 0.5px rgba(255, 255, 255, 0.2);
            
            /* Gradient teks */
            background-clip: text;
            -webkit-background-clip: text;
            color: transparent;
            background-image: linear-gradient(
                to right,
                #ffffff,
                #e0e0e0
            );
        }

        .top-text { 
            top: 5%; 
            font-size: min(6.5vw, 8.5vh);
        }

        .bottom-text { 
            bottom: 5%; 
            font-size: min(6.5vw, 8.5vh);
        }
    </style>
</head>
<body>
    <div class="meme-container">
        <img src="${url}" alt="Meme">
        <div class="meme-text top-text">${top}</div>
        <div class="meme-text bottom-text">${bottom}</div>
    </div>
</body>
</html>`
}, {
  html: ({
    top,
    bottom,
    url
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meme Generator</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@700&family=Share+Tech+Mono&family=VT323&display=swap" rel="stylesheet">
    <style>
        * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
            font-family: 'Share Tech Mono', monospace; 
        }
        
        body { 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            background: #000; 
            overflow: hidden; 
        }

        .meme-container { 
            position: absolute;
            inset: 0;
            display: flex; 
            justify-content: center; 
            align-items: center; 
            overflow: hidden; 
        }

        .meme-container img { 
            width: 100vw; 
            height: 100vh; 
            object-fit: cover;
            object-position: center; 
            filter: hue-rotate(20deg) contrast(1.2);
        }

        .meme-text { 
            position: absolute; 
            width: 90%; 
            text-align: center; 
            color: #ff0080; 
            font-weight: 700; 
            letter-spacing: 4px;
            padding: 20px; 
            line-height: 1.1; 
            word-wrap: break-word;
            overflow-wrap: break-word;
            
            /* Efek Glass Cyberpunk */
            background: rgba(255, 0, 128, 0.08);
            backdrop-filter: blur(5px) contrast(1.5);
            -webkit-backdrop-filter: blur(5px) contrast(1.5);
            border-radius: 5px;
            border: 2px solid #ff0080;
            box-shadow: 
                0 0 15px #ff0080,
                inset 0 0 20px rgba(255, 0, 128, 0.3),
                0 0 40px rgba(255, 0, 128, 0.2);
            
            /* Efek teks cyberpunk */
            text-shadow: 
                0 0 5px #fff,
                0 0 10px #ff0080,
                0 0 15px #ff0080,
                0 0 20px #ff0080;
            -webkit-text-stroke: 1px #ff0080;
            
            /* Animasi glow */
            animation: cyberGlow 2s ease-in-out infinite alternate;
        }

        @keyframes cyberGlow {
            from {
                box-shadow: 
                    0 0 15px #ff0080,
                    inset 0 0 20px rgba(255, 0, 128, 0.3);
                text-shadow: 
                    0 0 5px #fff,
                    0 0 10px #ff0080;
            }
            to {
                box-shadow: 
                    0 0 25px #ff0080,
                    inset 0 0 30px rgba(255, 0, 128, 0.5),
                    0 0 60px rgba(255, 0, 128, 0.4);
                text-shadow: 
                    0 0 10px #fff,
                    0 0 20px #ff0080,
                    0 0 30px #ff0080;
            }
        }

        .top-text { 
            top: 5%; 
            font-size: min(6vw, 8vh);
        }

        .bottom-text { 
            bottom: 5%; 
            font-size: min(6vw, 8vh);
        }
    </style>
</head>
<body>
    <div class="meme-container">
        <img src="${url}" alt="Meme">
        <div class="meme-text top-text">${top}</div>
        <div class="meme-text bottom-text">${bottom}</div>
    </div>
</body>
</html>`
}];
const getTemplate = ({
  template: index = 1,
  top,
  bottom,
  url
}) => {
  const templateIndex = Number(index);
  return templates[templateIndex - 1]?.html({
    top: top,
    bottom: bottom,
    url: url
  }) || "Template tidak ditemukan";
};
export default getTemplate;