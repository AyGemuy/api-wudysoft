const templates = [{
  html: ({
    text,
    output
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Anton&display=swap" rel="stylesheet">
    <style>
        body, html {
            margin: 10px;
            padding: 10px;
            width: 100vw;
            height: 100vh;
            background-color: transparent;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
        }

        .teks {
            font-family: 'Anton', sans-serif;
            font-weight: bold;
            text-align: center;
            -webkit-text-stroke: 1px black;
            letter-spacing: 2px;
            word-wrap: break-word;
            overflow-wrap: break-word;
            display: flex;
            align-items: center;
            justify-content: center;
            max-width: 90vw;
            max-height: 90vh;
            font-size: 10vw; /* Default ukuran awal */
        }
    </style>
    <title>Teks Dinamis</title>
</head>
<body>
    <div class="teks" id="teks">
        ${text}
    </div>

    <script>
        var type = "${output}"; // Ubah ke "png" untuk teks statis, "gif" untuk animasi

        function adjustFontSize() {
            var container = document.getElementById("teks");
            var fontSize = 10; // Ukuran awal
            container.style.fontSize = fontSize + "vw";

            var maxWidth = window.innerWidth * 0.9;
            var maxHeight = window.innerHeight * 0.9;

            while (container.scrollWidth < maxWidth && container.scrollHeight < maxHeight) {
                fontSize += 1;
                container.style.fontSize = fontSize + "vw";
                if (container.scrollWidth > maxWidth || container.scrollHeight > maxHeight) {
                    fontSize -= 1;
                    container.style.fontSize = fontSize + "vw";
                    break;
                }
            }

            while ((container.scrollWidth > maxWidth || container.scrollHeight > maxHeight) && fontSize > 1) {
                fontSize -= 1;
                container.style.fontSize = fontSize + "vw";
            }
        }

        function getRandomColor() {
            var r = Math.floor(Math.random() * 255);
            var g = Math.floor(Math.random() * 255);
            var b = Math.floor(Math.random() * 255);
            return "rgb(" + r + "," + g + "," + b + ")";
        }

        function animateTextColor() {
            var teks = document.getElementById("teks");

            if (type === "gif") {
                setInterval(function () {
                    teks.style.color = getRandomColor();
                }, 100); // Warna berubah setiap 500ms
            } else {
                teks.style.color = "#FFFFFF"; // Warna default (putih) jika type = "png"
            }
        }

        window.onload = function () {
            adjustFontSize();
            animateTextColor();
        };

        window.onresize = adjustFontSize;
    </script>
</body>
</html>`
}, {
  html: ({
    text,
    output
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
}, {
  html: ({
    text,
    output
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=Orbitron:wght@900&family=Rajdhani:wght@700&display=swap" rel="stylesheet">
    <style>
        body, html {
            margin: 10px;
            padding: 10px;
            width: 100vw;
            height: 100vh;
            background-color: transparent;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
        }

        .teks {
            font-family: 'Orbitron', monospace;
            font-weight: 900;
            text-align: center;
            letter-spacing: 4px;
            word-wrap: break-word;
            overflow-wrap: break-word;
            display: flex;
            align-items: center;
            justify-content: center;
            max-width: 90vw;
            max-height: 90vh;
            font-size: 10vw;
            
            /* Glass neon effect */
            background: rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 25px 35px;
            border: 3px solid;
            
            /* Efek teks neon */
            text-shadow: 
                0 0 5px currentColor,
                0 0 10px currentColor,
                0 0 15px currentColor,
                0 0 20px currentColor;
            -webkit-text-stroke: 1px currentColor;
        }
    </style>
    <title>Teks Dinamis</title>
</head>
<body>
    <div class="teks" id="teks">
        ${text}
    </div>

    <script>
        var type = "${output}";

        function adjustFontSize() {
            var container = document.getElementById("teks");
            var fontSize = 10;
            container.style.fontSize = fontSize + "vw";

            var maxWidth = window.innerWidth * 0.9;
            var maxHeight = window.innerHeight * 0.9;

            while (container.scrollWidth < maxWidth && container.scrollHeight < maxHeight) {
                fontSize += 1;
                container.style.fontSize = fontSize + "vw";
                if (container.scrollWidth > maxWidth || container.scrollHeight > maxHeight) {
                    fontSize -= 1;
                    container.style.fontSize = fontSize + "vw";
                    break;
                }
            }

            while ((container.scrollWidth > maxWidth || container.scrollHeight > maxHeight) && fontSize > 1) {
                fontSize -= 1;
                container.style.fontSize = fontSize + "vw";
            }
        }

        function getNeonColor() {
            var colors = [
                "#00ffea", "#ff00ff", "#00ff00", "#ffff00", 
                "#ff0080", "#0080ff", "#ff8000", "#80ff00"
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        }

        function animateTextColor() {
            var teks = document.getElementById("teks");

            if (type === "gif") {
                setInterval(function () {
                    var neonColor = getNeonColor();
                    teks.style.color = neonColor;
                    teks.style.borderColor = neonColor;
                    teks.style.boxShadow = '0 0 20px ' + neonColor + ', ' +
'inset 0 0 20px ' + neonColor + '40,' +
'0 0 40px ' + neonColor + '30';
                }, 200);
            } else {
                teks.style.color = "#00ffea";
                teks.style.borderColor = "#00ffea";
                teks.style.boxShadow = 
                    "0 0 20px #00ffea, inset 0 0 20px #00ffea40, 0 0 40px #00ffea30";
            }
        }

        window.onload = function () {
            adjustFontSize();
            animateTextColor();
        };

        window.onresize = adjustFontSize;
    </script>
</body>
</html>`
}, {
  html: ({
    text,
    output
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=Montserrat:wght@900&family=Raleway:wght@900&display=swap" rel="stylesheet">
    <style>
        body, html {
            margin: 10px;
            padding: 10px;
            width: 100vw;
            height: 100vh;
            background-color: transparent;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
        }

        .teks {
            font-family: 'Montserrat', sans-serif;
            font-weight: 900;
            text-align: center;
            letter-spacing: 2px;
            word-wrap: break-word;
            overflow-wrap: break-word;
            display: flex;
            align-items: center;
            justify-content: center;
            max-width: 90vw;
            max-height: 90vh;
            font-size: 10vw;
            
            /* Elegant glass effect */
            background: linear-gradient(
                135deg,
                rgba(255, 255, 255, 0.15),
                rgba(255, 255, 255, 0.05)
            );
            backdrop-filter: blur(20px) saturate(200%);
            -webkit-backdrop-filter: blur(20px) saturate(200%);
            border-radius: 30px;
            padding: 35px 45px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            
            /* Subtle text effects */
            text-shadow: 
                0 2px 10px rgba(0, 0, 0, 0.3),
                0 4px 20px rgba(0, 0, 0, 0.2);
        }
    </style>
    <title>Teks Dinamis</title>
</head>
<body>
    <div class="teks" id="teks">
        ${text}
    </div>

    <script>
        var type = "${output}";

        function adjustFontSize() {
            var container = document.getElementById("teks");
            var fontSize = 10;
            container.style.fontSize = fontSize + "vw";

            var maxWidth = window.innerWidth * 0.9;
            var maxHeight = window.innerHeight * 0.9;

            while (container.scrollWidth < maxWidth && container.scrollHeight < maxHeight) {
                fontSize += 1;
                container.style.fontSize = fontSize + "vw";
                if (container.scrollWidth > maxWidth || container.scrollHeight > maxHeight) {
                    fontSize -= 1;
                    container.style.fontSize = fontSize + "vw";
                    break;
                }
            }

            while ((container.scrollWidth > maxWidth || container.scrollHeight > maxHeight) && fontSize > 1) {
                fontSize -= 1;
                container.style.fontSize = fontSize + "vw";
            }
        }

        function getElegantColor() {
            var colors = [
                "#FFFFFF", "#E0E0E0", "#F8F8F8", "#F0F0F0",
                "#FFEBCD", "#E6E6FA", "#F0F8FF", "#FFF5EE"
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        }

        function getGradientBackground() {
            var gradients = [
                "linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1))",
                "linear-gradient(45deg, rgba(255,255,255,0.15), rgba(200,200,255,0.1))",
                "linear-gradient(135deg, rgba(255,240,245,0.2), rgba(240,248,255,0.1))",
                "linear-gradient(45deg, rgba(255,250,240,0.2), rgba(240,255,240,0.1))"
            ];
            return gradients[Math.floor(Math.random() * gradients.length)];
        }

        function animateTextColor() {
            var teks = document.getElementById("teks");

            if (type === "gif") {
                setInterval(function () {
                    teks.style.color = getElegantColor();
                    teks.style.background = getGradientBackground();
                }, 500);
            } else {
                teks.style.color = "#FFFFFF";
                teks.style.background = "linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1))";
            }
        }

        window.onload = function () {
            adjustFontSize();
            animateTextColor();
        };

        window.onresize = adjustFontSize;
    </script>
</body>
</html>`
}, {
  html: ({
    text,
    output
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=Share+Tech+Mono&family=VT323&family=Rajdhani:wght@700&display=swap" rel="stylesheet">
    <style>
        body, html {
            margin: 10px;
            padding: 10px;
            width: 100vw;
            height: 100vh;
            background-color: transparent;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
        }

        .teks {
            font-family: 'Share Tech Mono', monospace;
            font-weight: 700;
            text-align: center;
            letter-spacing: 5px;
            word-wrap: break-word;
            overflow-wrap: break-word;
            display: flex;
            align-items: center;
            justify-content: center;
            max-width: 90vw;
            max-height: 90vh;
            font-size: 10vw;
            
            /* Cyberpunk glass effect */
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(8px) contrast(1.5);
            -webkit-backdrop-filter: blur(8px) contrast(1.5);
            border-radius: 10px;
            padding: 20px 30px;
            border: 2px solid;
            box-shadow: 
                0 0 15px currentColor,
                inset 0 0 20px currentColor40;
        }
    </style>
    <title>Teks Dinamis</title>
</head>
<body>
    <div class="teks" id="teks">
        ${text}
    </div>

    <script>
        var type = "${output}";

        function adjustFontSize() {
            var container = document.getElementById("teks");
            var fontSize = 10;
            container.style.fontSize = fontSize + "vw";

            var maxWidth = window.innerWidth * 0.9;
            var maxHeight = window.innerHeight * 0.9;

            while (container.scrollWidth < maxWidth && container.scrollHeight < maxHeight) {
                fontSize += 1;
                container.style.fontSize = fontSize + "vw";
                if (container.scrollWidth > maxWidth || container.scrollHeight > maxHeight) {
                    fontSize -= 1;
                    container.style.fontSize = fontSize + "vw";
                    break;
                }
            }

            while ((container.scrollWidth > maxWidth || container.scrollHeight > maxHeight) && fontSize > 1) {
                fontSize -= 1;
                container.style.fontSize = fontSize + "vw";
            }
        }

        function getCyberpunkColor() {
            var colors = [
                "#ff0080", "#00ffea", "#00ff00", "#ffff00",
                "#ff8000", "#8000ff", "#ff00ff", "#0080ff"
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        }

        function animateTextColor() {
            var teks = document.getElementById("teks");

            if (type === "gif") {
                var animationInterval = setInterval(function () {
                    var color = getCyberpunkColor();
                    teks.style.color = color;
                    teks.style.borderColor = color;
                    teks.style.textShadow = "0 0 10px " + color + ", 0 0 20px " + color + ", 0 0 30px " + color;
                    teks.style.boxShadow = "0 0 20px " + color + ", inset 0 0 25px " + color + "60, 0 0 50px " + color + "30";
                }, 150);
                
                // Tambahkan efek flicker acak
                setInterval(function () {
                    if (Math.random() > 0.7) {
                        teks.style.opacity = "0.8";
                        setTimeout(function() {
                            teks.style.opacity = "1";
                        }, 50);
                    }
                }, 300);
            } else {
                teks.style.color = "#ff0080";
                teks.style.borderColor = "#ff0080";
                teks.style.textShadow = "0 0 10px #ff0080, 0 0 20px #ff0080";
                teks.style.boxShadow = 
                    "0 0 20px #ff0080, inset 0 0 25px #ff008060, 0 0 50px #ff008030";
            }
        }

        window.onload = function () {
            adjustFontSize();
            animateTextColor();
        };

        window.onresize = adjustFontSize;
    </script>
</body>
</html>`
}];
const getTemplate = ({
  template: index = 1,
  text,
  output
}) => {
  const templateIndex = Number(index);
  return templates[templateIndex - 1]?.html({
    text: text,
    output: output
  }) || "Template tidak ditemukan";
};
export default getTemplate;