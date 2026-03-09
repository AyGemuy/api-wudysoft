const templateData = [{
  imageUrl: "https://i.pinimg.com/originals/16/37/17/163717b994654c0bc17f7ae70a14615f.jpg",
  left: 218,
  top: 25,
  width: 324,
  height: 235,
  fontSize: 45,
  lineHeight: 1.2,
  padding: 0,
  rotate: null
}, {
  imageUrl: "https://i.pinimg.com/originals/52/99/de/5299de50d2a4b9ece6a631ceb6cfd5b3.jpg",
  left: 66,
  top: 323,
  width: 640,
  height: 879,
  fontSize: 65,
  lineHeight: 1.1,
  padding: 10,
  rotate: null
}, {
  imageUrl: "https://i.pinimg.com/originals/4b/fd/05/4bfd05293cd9fa7a9d22f71bb968ca44.jpg",
  left: 81,
  top: 25,
  width: 336,
  height: 230,
  fontSize: 32,
  lineHeight: 1.2,
  padding: 5,
  rotate: null
}, {
  imageUrl: "https://i.pinimg.com/originals/d8/56/01/d85601f6d14a4ed5f8542361da6f5594.png",
  left: 258,
  top: 750,
  width: 505,
  height: 317,
  fontSize: 55,
  lineHeight: 1.1,
  padding: 8,
  rotate: null
}, {
  imageUrl: "https://i.pinimg.com/originals/97/8a/ad/978aad731ecea982769174d6114778ca.jpg",
  left: 262,
  top: 175,
  width: 167,
  height: 223,
  fontSize: 25,
  lineHeight: 1.15,
  padding: 6,
  rotate: null
}, {
  imageUrl: "https://i.pinimg.com/originals/b4/51/b2/b451b228a66d109a072017a0a92f4f6b.jpg",
  left: 284,
  top: 396,
  width: 363,
  height: 358,
  fontSize: 50,
  lineHeight: 1.2,
  padding: 10,
  rotate: "3deg"
}, {
  imageUrl: "https://i.pinimg.com/originals/89/ab/c6/89abc6e42ffe2c34a50226fff3fa6cbf.jpg",
  left: 705,
  top: 240,
  width: 452,
  height: 488,
  fontSize: 55,
  lineHeight: 1.2,
  padding: 12,
  rotate: null
}, {
  imageUrl: "https://i.pinimg.com/originals/f7/e6/60/f7e660e632c8382ac2d524c504e50dcc.png",
  left: 64,
  top: 274,
  width: 173,
  height: 93,
  fontSize: 20,
  lineHeight: 1,
  padding: 3,
  rotate: "-4deg"
}, {
  imageUrl: "https://i.pinimg.com/originals/f4/b6/99/f4b69979d8f56fcf37f2553dcd877a53.jpg",
  left: 190,
  top: 440,
  width: 410,
  height: 381,
  fontSize: 50,
  lineHeight: 1.15,
  padding: 10,
  rotate: "-4deg"
}, {
  imageUrl: "https://i.pinimg.com/originals/17/c3/af/17c3afdac42bb0d7a47fd57a94a505c5.jpg",
  left: 68,
  top: 327,
  width: 399,
  height: 233,
  fontSize: 30,
  lineHeight: 1.1,
  padding: 8,
  rotate: "-9deg"
}, {
  imageUrl: "https://i.pinimg.com/originals/85/40/35/854035ae105052ac5da4331c5d5c2551.jpg",
  left: 50,
  top: 343,
  width: 428,
  height: 320,
  fontSize: 55,
  lineHeight: 1.15,
  padding: 10,
  rotate: null
}, {
  imageUrl: "https://c.termai.cc/i172/LpJ.jpeg",
  left: 241,
  top: 307,
  width: 253,
  height: 163,
  fontSize: 38,
  lineHeight: 1.15,
  padding: 10,
  rotate: null
}, {
  imageUrl: "https://8upload.com/image/ac29250b838398ec/perpus.jpg",
  left: 211,
  top: 585,
  width: 498,
  height: 341,
  fontSize: 70,
  lineHeight: 1.15,
  padding: 10,
  rotate: "-2deg"
}, {
  imageUrl: "https://8upload.com/image/da41634c1154be59/ruang.jpg",
  left: 176,
  top: 395,
  width: 234,
  height: 180,
  fontSize: 40,
  lineHeight: 1.15,
  padding: 10,
  rotate: "1.5deg"
}];
const defaultStyles = {
  fontFamily: "Patrick Hand, cursive",
  color: "black",
  backgroundColor: "transparent",
  opacity: 5,
  fontWeight: "bold",
  textAlign: "center",
  lineHeight: "1.2",
  boxSizing: "border-box",
  padding: "0",
  rotate: "0deg"
};

function mergeParams(params) {
  const {
    template = 1,
      text = "", ...overrides
  } = params;
  const idx = Number(template) - 1;
  let base = {};
  if (idx >= 0 && idx < templateData.length) {
    base = {
      ...templateData[idx]
    };
    if (base.fontSize) base.fontSize = base.fontSize + "px";
    if (base.padding !== undefined) base.padding = base.padding + "px";
    if (base.rotate === null) base.rotate = "0deg";
  }
  const merged = {
    ...defaultStyles,
    ...base,
    ...overrides
  };
  merged.text = text;
  merged.left = merged.left ?? 0;
  merged.top = merged.top ?? 0;
  merged.width = merged.width ?? 200;
  merged.height = merged.height ?? 100;
  return merged;
}

function generateHTML(p) {
  const textStyle = `
    left: ${p.left}px;
    top: ${p.top}px;
    width: ${p.width}px;
    height: ${p.height}px;
    transform: rotate(${p.rotate});
    color: ${p.color};
    font-family: ${p.fontFamily};
    font-size: ${p.fontSize};
    font-weight: ${p.fontWeight};
    text-align: ${p.textAlign};
    line-height: ${p.lineHeight};
    background: ${p.backgroundColor};
    opacity: ${p.opacity};
    padding: ${p.padding};
    box-sizing: ${p.boxSizing};
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    word-wrap: break-word;
  `;
  return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meme Generator</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Indie+Flower&family=Caveat:wght@400;700&family=Gloria+Hallelujah&family=Architects+Daughter&family=Kalam:wght@300;400;700&family=Permanent+Marker&family=Satisfy&display=swap');
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #f4f4f4;
            margin: 0;
        }
        .meme-container {
            position: relative;
            display: inline-block;
            text-align: center;
        }
        .meme-container img {
            object-fit: cover;
            display: block;
            max-width: 100%;
            height: auto;
        }
        .meme-text {
            position: absolute;
            ${textStyle}
        }
    </style>
</head>
<body>
    <div class="meme-container">
        <img src="${p.imageUrl}" alt="Meme Image">
        <div class="meme-text">${p.text}</div>
    </div>
</body>
</html>`;
}
const getTemplate = options => {
  const merged = mergeParams(options);
  return generateHTML(merged);
};
export default getTemplate;