const templates = [{
  html: ({
    text = "Hai Bang, Apa Kabar?",
    output = "png",
    fontIndex = "0",
    colorIndex = "0",
    bgIndex = "0"
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Canvas 800x800 · emoji apple + font & color arrays</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: #111;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        canvas {
            display: block;
            width: 800px;
            height: 800px;
            max-width: 100vw;
            max-height: 100vh;
            aspect-ratio: 1 / 1;
            background: white;
            box-shadow: 0 0 30px rgba(0,0,0,0.7);
        }
    </style>
</head>
<body>
    <canvas id="mainCanvas" width="800" height="800"></canvas>

    <script>
        (function() {
            const fontOptions = [
                'Arial, "Helvetica Neue", sans-serif',
                'Helvetica, Arial, sans-serif',
                '"Times New Roman", Times, serif',
                '"Courier New", Courier, monospace',
                'Georgia, serif'
            ];
            const colorOptions = ['black', 'red', 'blue', 'green', 'purple'];
            const bgOptions = ['white', 'lightgray', 'yellow', 'cyan', 'pink'];

            const fontIndex = parseInt("${fontIndex}");
            const colorIndex = parseInt("${colorIndex}");
            const bgIndex = parseInt("${bgIndex}");

            const font = fontOptions[fontIndex] || fontOptions[0];
            const textColor = colorOptions[colorIndex] || colorOptions[0];
            const bgColor = bgOptions[bgIndex] || bgOptions[0];

            // Segmenter untuk split grapheme cluster (support semua emoji sequence)
            const segmenter = new Intl.Segmenter("id", { granularity: "grapheme" });

            function segments(str) {
                return [...segmenter.segment(str)].map(s => s.segment);
            }

            function isEmoji(grapheme) {
                const first = grapheme.codePointAt(0);
                return grapheme.includes('\uFE0F') ||
                       grapheme.includes('\u200D') ||
                       first >= 0x1F000 ||
                       (first >= 0x2300 && first <= 0x27BF) ||
                       [...grapheme].some(c => {
                           const cp = c.codePointAt(0);
                           return (cp >= 0x1F1E0 && cp <= 0x1F1FF) ||
                                  (cp >= 0x1F3FB && cp <= 0x1F3FF);
                       });
            }

            // Load emoji dari https://emoji-cdn.mqrio.dev langsung pakai encodeURIComponent
            // Tidak perlu konversi codepoint — kirim emoji as-is di URL
            function loadEmoji(grapheme) {
                return new Promise((res) => {
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.onload  = () => res(img);
                    img.onerror = () => res(null);
                    img.src = "https://emoji-cdn.mqrio.dev/" + encodeURIComponent(grapheme) + "?style=apple";
                });
            }

            let gcw = null;

            function wrap(str, maxW, fs) {
                ctx.font = fs + "px " + font;
                const words = str.split(" ");
                const lines = [];
                let cur = [], curW = 0;
                words.forEach(w => {
                    let ww = 0;
                    segments(w).forEach(g => ww += gcw(g, fs));
                    const sw = ctx.measureText(" ").width;
                    const tw = curW + (cur.length > 0 ? sw : 0) + ww;
                    if (tw > maxW && cur.length > 0) {
                        lines.push(cur);
                        cur = [w];
                        curW = ww;
                    } else {
                        if (cur.length > 0) curW += sw;
                        cur.push(w);
                        curW += ww;
                    }
                });
                if (cur.length > 0) lines.push(cur);
                return lines;
            }

            function glw(line, fs) {
                let tw = 0;
                const sw = ctx.measureText(" ").width;
                line.forEach((w, i) => {
                    if (i > 0) tw += sw;
                    segments(w).forEach(g => tw += gcw(g, fs));
                });
                return tw;
            }

            const canvas = document.getElementById('mainCanvas');
            const ctx = canvas.getContext('2d');
            const W = 800, H = 800;

            gcw = function(grapheme, fs) {
                if (isEmoji(grapheme)) return fs;
                ctx.font = fs + "px " + font;
                return ctx.measureText(grapheme).width;
            };

            const teks = "${text.replace(/"/g, '\\"').replace(/\\/g, "\\\\")}";

            const PADDING = 40;
            const maxWidth = W - 2 * PADDING;
            const maxHeight = H - 2 * PADDING;
            const LINE_HEIGHT_RATIO = 1.2;

            const imageCache = new Map();

            async function loadEmojis(text) {
                const promises = [];
                for (const grapheme of segments(text)) {
                    if (isEmoji(grapheme) && !imageCache.has(grapheme)) {
                        const promise = loadEmoji(grapheme).then(img => {
                            imageCache.set(grapheme, img);
                        });
                        promises.push(promise);
                    }
                }
                await Promise.all(promises);
            }

            function findMaxFontSize(minFs, maxFs) {
                let low = minFs, high = maxFs;
                let best = minFs;
                while (low <= high) {
                    const mid = Math.floor((low + high) / 2);
                    const lines = wrap(teks, maxWidth, mid);
                    const totalHeight = lines.length * mid * LINE_HEIGHT_RATIO;
                    if (totalHeight <= maxHeight) {
                        best = mid;
                        low = mid + 1;
                    } else {
                        high = mid - 1;
                    }
                }
                return best;
            }

            function drawJustified(lines, fs) {
                const lineHeight = fs * LINE_HEIGHT_RATIO;
                const totalHeight = lines.length * lineHeight;
                let startY = (H - totalHeight) / 2 + fs * 0.85;

                for (let l = 0; l < lines.length; l++) {
                    const lineWords = lines[l];

                    let totalWordsWidth = 0;
                    for (let w of lineWords) {
                        segments(w).forEach(g => totalWordsWidth += gcw(g, fs));
                    }

                    const spaceCount = lineWords.length - 1;
                    const extraSpace = (maxWidth - totalWordsWidth) / (spaceCount || 1);

                    let x = PADDING;
                    for (let i = 0; i < lineWords.length; i++) {
                        const word = lineWords[i];

                        for (const grapheme of segments(word)) {
                            if (isEmoji(grapheme)) {
                                const img = imageCache.get(grapheme);
                                if (img) {
                                    ctx.drawImage(img, x, startY - fs * 0.85, fs, fs);
                                }
                                x += fs;
                            } else {
                                ctx.font = fs + 'px ' + font;
                                ctx.fillText(grapheme, x, startY);
                                x += ctx.measureText(grapheme).width;
                            }
                        }

                        if (i < lineWords.length - 1) {
                            x += extraSpace;
                        }
                    }
                    startY += lineHeight;
                }
            }

            async function render() {
                await loadEmojis(teks);

                ctx.clearRect(0, 0, W, H);
                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, W, H);

                ctx.filter = 'blur(2px)';
                ctx.fillStyle = textColor;
                ctx.shadowColor = 'transparent';

                const optimalFs = findMaxFontSize(10, 200);
                if (optimalFs < 10) {
                    ctx.font = '20px ' + font;
                    ctx.fillText('teks terlalu panjang', PADDING, H/2);
                    return;
                }

                const lines = wrap(teks, maxWidth, optimalFs);
                drawJustified(lines, optimalFs);
            }

            render().catch(console.error);
        })();
    </script>
</body>
</html>`
}, {
  html: ({
    text = "Hai Bang, Apa Kabar?",
    output = "png",
    font: fi = "a",
    tema = "default",
    delay = 1e3
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Canvas Text</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;700&family=Roboto:wght@400;700&family=Oswald:wght@400;700&family=Bebas+Neue&family=Montserrat:wght@400;700&family=Playfair+Display:wght@400;700&family=Lato:wght@400;700&family=Poppins:wght@400;700&family=Anton&family=Abril+Fatface&family=Righteous&family=Pacifico&family=Bangers&family=Lobster&family=Permanent+Marker&family=Satisfy&family=Dancing+Script:wght@400;700&family=Caveat:wght@400;700&family=Comfortaa:wght@400;700&display=swap">
    <style>
        body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; }
        canvas { border: 1px solid #ccc; }
    </style>
</head>
<body>
    <canvas id="myCanvas" width="800" height="800"></canvas>
    <script src="https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js"></script>
    <script>
        const fm = {
            a: "-apple-system, BlinkMacSystemFont, \\"Segoe UI\\", Helvetica, Arial, sans-serif",
            b: "Roboto, sans-serif",
            c: "Montserrat, sans-serif",
            d: "Lato, sans-serif",
            e: "Poppins, sans-serif",
            f: "Oswald, sans-serif",
            g: "Rajdhani, sans-serif",
            h: "Impact, sans-serif",
            i: "Anton, sans-serif",
            j: "Bebas Neue, sans-serif",
            k: "Abril Fatface, serif",
            l: "Righteous, sans-serif",
            m: "Bangers, sans-serif",
            n: "Pacifico, cursive",
            o: "Lobster, cursive",
            p: "Permanent Marker, cursive",
            q: "Satisfy, cursive",
            r: "Dancing Script, cursive",
            s: "Caveat, cursive",
            t: "Comfortaa, cursive",
            u: "Playfair Display, serif",
        };

        const tm = {
            default:   { bg: "#ffffff", color: "#000000", shadow: null },
            cyberpunk: { bg: "#0d0d0d", color: "#ffe600", shadow: { color: "#ff007c", blur: 18, ox: 3, oy: 3 } },
            neon:      { bg: "#000000", color: "#ffffff", shadow: { color: "#00ffff", blur: 24, ox: 0, oy: 0 } },
            nebula:    { bg: "#0a0015", color: "#e8d5ff", shadow: { color: "#9b59ff", blur: 30, ox: 0, oy: 0 } },
            nexus:     { bg: "#020c1b", color: "#00ff9f", shadow: { color: "#00bfff", blur: 20, ox: 2, oy: 2 } },
            retro:     { bg: "#1a0a00", color: "#ff6a00", shadow: { color: "#ffcc00", blur: 14, ox: 2, oy: 2 } },
            matrix:    { bg: "#000000", color: "#00ff41", shadow: { color: "#00ff41", blur: 10, ox: 0, oy: 0 } },
            sunset:    { bg: "#1a0030", color: "#ff6ec7", shadow: { color: "#ffae42", blur: 20, ox: 0, oy: 0 } },
            ice:       { bg: "#e8f4fc", color: "#0077b6", shadow: { color: "#90e0ef", blur: 12, ox: 0, oy: 0 } },
            gold:      { bg: "#0d0900", color: "#ffd700", shadow: { color: "#b8860b", blur: 16, ox: 2, oy: 2 } },
            aurora:    { bg: "#020f14", color: "#a8ffdb", shadow: { color: "#00f5a0", blur: 28, ox: 0, oy: 0 } },
            lava:      { bg: "#0d0000", color: "#ff4500", shadow: { color: "#ff8c00", blur: 22, ox: 0, oy: 0 } },
        };

        const tema  = "${tema}";
        const th    = tm[tema] || tm.default;

        const fi    = "${fi}";
        const font  = fm[fi] || fm.a;
        const color = th.color;
        const bg    = th.bg;
        const delay = ${Number(delay) || 1e3};

        const cvs  = document.getElementById("myCanvas");
        const ctx  = cvs.getContext("2d");
        const text = "${text.replace(/"/g, '\\"').replace(/\\/g, "\\\\")}";
        const out  = "${output}";

        // Segmenter untuk split grapheme cluster (support semua emoji sequence)
        const segmenter = new Intl.Segmenter("id", { granularity: "grapheme" });

        function segments(str) {
            return [...segmenter.segment(str)].map(s => s.segment);
        }

        function isEmoji(grapheme) {
            const first = grapheme.codePointAt(0);
            return grapheme.includes('\uFE0F') ||
                   grapheme.includes('\u200D') ||
                   first >= 0x1F000 ||
                   (first >= 0x2300 && first <= 0x27BF) ||
                   [...grapheme].some(c => {
                       const cp = c.codePointAt(0);
                       return (cp >= 0x1F1E0 && cp <= 0x1F1FF) ||
                              (cp >= 0x1F3FB && cp <= 0x1F3FF);
                   });
        }

        // Load emoji dari https://emoji-cdn.mqrio.dev langsung pakai encodeURIComponent
        function loadEmoji(grapheme) {
            return new Promise((res) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload  = () => res(img);
                img.onerror = () => res(null);
                img.src = "https://emoji-cdn.mqrio.dev/" + encodeURIComponent(grapheme) + "?style=apple";
            });
        }

        function gcw(grapheme, fs) {
            if (isEmoji(grapheme)) return fs;
            ctx.font = fs + "px " + font;
            return ctx.measureText(grapheme).width;
        }

        function wrap(str, maxW, fs) {
            ctx.font = fs + "px " + font;
            const words = str.split(" ");
            const lines = [];
            let cur = [], curW = 0;
            words.forEach(w => {
                let ww = 0;
                segments(w).forEach(g => ww += gcw(g, fs));
                const sw = ctx.measureText(" ").width;
                const tw = curW + (cur.length > 0 ? sw : 0) + ww;
                if (tw > maxW && cur.length > 0) { lines.push(cur); cur = [w]; curW = ww; }
                else { if (cur.length > 0) curW += sw; cur.push(w); curW += ww; }
            });
            if (cur.length > 0) lines.push(cur);
            return lines;
        }

        function glw(line, fs) {
            let tw = 0;
            const sw = ctx.measureText(" ").width;
            line.forEach((w, i) => {
                if (i > 0) tw += sw;
                segments(w).forEach(g => tw += gcw(g, fs));
            });
            return tw;
        }

        function setShadow() {
            if (th.shadow) {
                ctx.shadowColor   = th.shadow.color;
                ctx.shadowBlur    = th.shadow.blur;
                ctx.shadowOffsetX = th.shadow.ox;
                ctx.shadowOffsetY = th.shadow.oy;
            }
        }

        function clearShadow() {
            ctx.shadowColor   = "transparent";
            ctx.shadowBlur    = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }

        async function drawBg() {
            if (tema === "nebula") {
                const grad = ctx.createRadialGradient(400, 400, 50, 400, 400, 600);
                grad.addColorStop(0, "#1a0040");
                grad.addColorStop(1, "#0a0015");
                ctx.fillStyle = grad;
            } else if (tema === "sunset") {
                const grad = ctx.createLinearGradient(0, 0, 0, 800);
                grad.addColorStop(0, "#1a0030");
                grad.addColorStop(1, "#3d0050");
                ctx.fillStyle = grad;
            } else if (tema === "aurora") {
                const grad = ctx.createLinearGradient(0, 0, 800, 800);
                grad.addColorStop(0, "#020f14");
                grad.addColorStop(0.5, "#011f30");
                grad.addColorStop(1, "#020f14");
                ctx.fillStyle = grad;
            } else {
                ctx.fillStyle = bg;
            }
            ctx.fillRect(0, 0, 800, 800);
        }

        // Cache emoji images untuk menghindari request berulang
        const imageCache = new Map();

        async function getEmojiImage(grapheme) {
            if (imageCache.has(grapheme)) return imageCache.get(grapheme);
            const img = await loadEmoji(grapheme);
            imageCache.set(grapheme, img);
            return img;
        }

        async function draw(str) {
            const pad = 20, maxW = 800 - pad * 2, maxH = 800 - pad * 2;
            let fs = 200, best = 10, lines = [];
            while (fs > 10) {
                lines = wrap(str, maxW, fs);
                const lh = fs * 1.2;
                if (lines.length * lh - (lh - fs) <= maxH) { best = fs; break; }
                fs--;
            }
            fs = best;
            lines = wrap(str, maxW, fs);

            await drawBg();

            ctx.fillStyle = color;
            ctx.font = fs + "px " + font;
            ctx.textBaseline = "top";

            const lh = fs * 1.2, totH = lines.length * lh - (lh - fs);
            const vs = lines.length > 1 ? (maxH - totH) / (lines.length - 1) : 0;

            for (let li = 0; li < lines.length; li++) {
                const line = lines[li], ly = pad + li * (lh + vs), last = li === lines.length - 1;
                const ews = (!last && line.length > 1) ? (maxW - glw(line, fs)) / (line.length - 1) : 0;
                let x = pad;
                for (let wi = 0; wi < line.length; wi++) {
                    for (const grapheme of segments(line[wi])) {
                        if (isEmoji(grapheme)) {
                            const ei = await getEmojiImage(grapheme);
                            clearShadow();
                            if (ei) {
                                ctx.drawImage(ei, x, ly, fs, fs);
                            }
                            x += fs;
                        } else {
                            setShadow();
                            ctx.fillText(grapheme, x, ly);
                            clearShadow();
                            x += ctx.measureText(grapheme).width;
                        }
                    }
                    if (wi < line.length - 1) x += ctx.measureText(" ").width + (!last ? ews : 0);
                }
            }
        }

        function cap() {
            const tc = document.createElement("canvas");
            tc.width = tc.height = 800;
            tc.getContext("2d").drawImage(cvs, 0, 0);
            return tc;
        }

        async function init() {
            if (out === "gif") {
                const words = text.split(" ");
                const gif = new GIF({
                    workers: 2, quality: 10, width: 800, height: 800,
                    workerScript: "https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js"
                });
                for (let i = 0; i < words.length; i++) {
                    await draw(words.slice(0, i + 1).join(" "));
                    gif.addFrame(cap(), { delay, copy: true });
                    await new Promise(r => setTimeout(r, delay));
                }
                gif.on("finished", blob => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = "output.gif"; a.click();
                    URL.revokeObjectURL(url);
                });
                gif.render();
            } else {
                await draw(text);
            }
        }

        document.fonts.ready.then(() => init());
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