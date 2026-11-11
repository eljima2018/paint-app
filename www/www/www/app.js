const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#fff';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

let tool = 'brush', drawing = false, startX, startY, snapshot;
let undoStack = [], redoStack = [];

const colorEl = document.getElementById('color');
const sizeEl = document.getElementById('size');

function saveState() {
  undoStack.push(canvas.toDataURL());
  if (undoStack.length > 50) undoStack.shift();
  redoStack = [];
}
function restore(dataUrl) {
  const img = new Image();
  img.onload = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0); };
  img.src = dataUrl;
}
function pos(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (canvas.width / r.width),
    y: (e.clientY - r.top) * (canvas.height / r.height)
  };
}

canvas.addEventListener('pointerdown', e => {
  saveState();
  drawing = true;
  const p = pos(e);
  startX = p.x; startY = p.y;
  snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
});

canvas.addEventListener('pointermove', e => {
  if (!drawing) return;
  const p = pos(e);
  ctx.lineWidth = sizeEl.value;
  ctx.strokeStyle = tool === 'eraser' ? '#fff' : colorEl.value;

  if (tool === 'brush' || tool === 'eraser') {
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  } else {
    ctx.putImageData(snapshot, 0, 0);
    ctx.beginPath();
    if (tool === 'line') {
      ctx.moveTo(startX, startY); ctx.lineTo(p.x, p.y);
    } else if (tool === 'rect') {
      ctx.rect(startX, startY, p.x - startX, p.y - startY);
    } else if (tool === 'circle') {
      const r = Math.hypot(p.x - startX, p.y - startY);
      ctx.arc(startX, startY, r, 0, Math.PI * 2);
    }
    ctx.stroke();
  }
});

['pointerup', 'pointerleave'].forEach(ev =>
  canvas.addEventListener(ev, () => { drawing = false; })
);

document.querySelectorAll('[data-tool]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelector('[data-tool].active').classList.remove('active');
    btn.classList.add('active');
    tool = btn.dataset.tool;
  });
});

document.getElementById('undo').onclick = () => {
  if (!undoStack.length) return;
  redoStack.push(canvas.toDataURL());
  restore(undoStack.pop());
};
document.getElementById('redo').onclick = () => {
  if (!redoStack.length) return;
  undoStack.push(canvas.toDataURL());
  restore(redoStack.pop());
};
document.getElementById('clear').onclick = () => {
  saveState();
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
};

document.getElementById('save').onclick = async () => {
  const dataUrl = canvas.toDataURL('image/png');

  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    try {
      const { Filesystem, Share } = window.Capacitor.Plugins;
      const fileName = 'painting-' + Date.now() + '.png';
      const saved = await Filesystem.writeFile({
        path: fileName,
        data: dataUrl.split(',')[1],
        directory: 'CACHE'
      });
      await Share.share({ title: 'نقاشی من', url: saved.uri });
    } catch (err) {
      alert('خطا در ذخیره: ' + err.message);
    }
    return;
  }

  const a = document.createElement('a');
  a.download = 'painting.png';
  a.href = dataUrl;
  a.click();
};
