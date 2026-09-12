const templates = [{
  html: ({
    avatar = "https://i.pinimg.com/736x/e2/b7/7f/e2b77fa4d0f2ce86ab0620168c676123.jpg",
    frame = "https://frame.cdn.twibbonize.com/f2d5b60f-c394-4801-9ba0-1e030461f309.png",
    coord = ""
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Twibbon</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
    }
    #wrap { position: relative; }
    #avatar {
      position: absolute;
      object-fit: cover;
    }
    #frame {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <div id="wrap">
    <img id="avatar" crossorigin="anonymous" src="" alt="">
    <img id="frame"  crossorigin="anonymous" src="" alt="">
  </div>

  <script>
    const avatar = "${avatar}";
    const frame  = "${frame}";
    const coord  = "${coord}";

    const wrap = document.getElementById('wrap');
    const fi   = document.getElementById('frame');
    const ai   = document.getElementById('avatar');

    fi.onload = function() {
      const W  = fi.naturalWidth, H = fi.naturalHeight;
      const sc = Math.min(innerWidth, innerHeight) / Math.max(W, H);

      wrap.style.width  = W * sc + 'px';
      wrap.style.height = H * sc + 'px';

      let cx, cy;
      if (coord && coord.trim()) {
        const [x1, y1, x2, y2] = coord.split(',').map(Number);
        cx = ((x1 + x2) / 2) * sc;
        cy = ((y1 + y2) / 2) * sc;
      } else {
        cx = (W / 2) * sc;
        cy = (H / 2) * sc;
      }

      const avW = W * 0.65 * sc;
      const avH = H * 0.65 * sc;

      ai.style.left   = cx - avW / 2 + 'px';
      ai.style.top    = cy - avH / 2 + 'px';
      ai.style.width  = avW + 'px';
      ai.style.height = avH + 'px';
    };

    fi.src = frame;
    ai.src = avatar;

    addEventListener('resize', () => fi.naturalWidth && fi.onload());
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