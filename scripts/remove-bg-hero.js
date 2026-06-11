// ลบพื้นหลังขาวของ mascot-hero.png ด้วย flood-fill จากขอบ
// ตัวมาสคอตขาวถูกเส้นขอบกรมท่ากั้นไว้ จึงไม่ถูกลบ
// รัน: node scripts/remove-bg-hero.js
const sharp = require("sharp");
const path = require("path");

// รับชื่อไฟล์จาก arg (default = mascot-hero.png) เช่น: node scripts/remove-bg-hero.js logo-mascot.png
const FILE = process.argv[2] || "mascot-hero.png";
const SRC = path.resolve(__dirname, "..", "public", "images", FILE);
const OUT = SRC; // เขียนทับ
const TOL = 60; // tolerance สีพื้นหลัง (พื้นหลังขาวล้วน เผื่อ anti-alias/เงา)

function dist2(r, g, b, r2, g2, b2) {
  const dr = r - r2, dg = g - g2, db = b - b2;
  return dr * dr + dg * dg + db * db;
}

(async () => {
  const { data, info } = await sharp(SRC)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels } = info;
  const tol2 = TOL * TOL;

  // สีพื้นหลัง = เฉลี่ย 4 มุม
  const corners = [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]];
  let br = 0, bg = 0, bb = 0;
  for (const [x, y] of corners) {
    const i = (y * W + x) * channels;
    br += data[i]; bg += data[i + 1]; bb += data[i + 2];
  }
  br /= 4; bg /= 4; bb /= 4;

  const alpha = new Uint8Array(W * H).fill(255);
  const visited = new Uint8Array(W * H);
  const stack = [];
  const pushIf = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const p = y * W + x;
    if (visited[p]) return;
    visited[p] = 1;
    const i = p * channels;
    if (dist2(data[i], data[i + 1], data[i + 2], br, bg, bb) <= tol2) {
      alpha[p] = 0;
      stack.push(p);
    }
  };
  for (let x = 0; x < W; x++) { pushIf(x, 0); pushIf(x, H - 1); }
  for (let y = 0; y < H; y++) { pushIf(0, y); pushIf(W - 1, y); }
  while (stack.length) {
    const p = stack.pop();
    const x = p % W, y = (p / W) | 0;
    pushIf(x - 1, y); pushIf(x + 1, y); pushIf(x, y - 1); pushIf(x, y + 1);
  }

  // เขียน alpha กลับ
  for (let p = 0; p < W * H; p++) data[p * channels + 3] = alpha[p];

  // trim bbox ของพิกเซลทึบ
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (alpha[y * W + x] > 16) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  const pad = 12;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(W - 1, maxX + pad); maxY = Math.min(H - 1, maxY + pad);
  const cw = maxX - minX + 1, ch = maxY - minY + 1;

  await sharp(data, { raw: { width: W, height: H, channels } })
    .extract({ left: minX, top: minY, width: cw, height: ch })
    .png({ compressionLevel: 9 })
    .toFile(OUT + ".tmp.png");

  // ย้ายทับ
  require("fs").renameSync(OUT + ".tmp.png", OUT);
  console.log(`✓ ลบพื้นหลังเสร็จ → ${cw}x${ch}`);
})();
