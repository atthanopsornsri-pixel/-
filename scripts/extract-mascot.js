// One-off: ตัดแยกมาสคอตจาก sprite sheet + ลบพื้นหลังครีมด้วย flood-fill จากขอบ
// รัน: node scripts/extract-mascot.js
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "public", "images", "mascot");
fs.mkdirSync(OUT, { recursive: true });

// แต่ละ sheet 1536x1024 = 3 คอลัมน์ x 2 แถว, ตัวการ์ตูนอยู่ครึ่งบนของช่อง
const CELL_W = 512;
const CELL_H = 512;
const CHAR_H = 372; // สูงเฉพาะตัวการ์ตูน (ตัดคำบรรยายล่างทิ้ง)
const TOL = 44; // tolerance ระยะสี (Euclidean RGB) สำหรับถือว่าเป็นพื้นหลัง

const SHEETS = [
  {
    file: "DDED27DD-0664-4A11-A0C5-1991C8230FE1.png",
    names: ["invoice", "payment", "record", "expense", "report", "profit"],
  },
  {
    file: "0D1C0237-AE10-4F01-A9A4-25D494386691.png",
    names: ["promote", "promotion", "target", "ad", "analyze", "attract"],
  },
];

function dist2(r, g, b, r2, g2, b2) {
  const dr = r - r2, dg = g - g2, db = b - b2;
  return dr * dr + dg * dg + db * db;
}

async function processCell(buf, info, name) {
  const { width: W, height: H, channels } = info;
  const data = buf; // RGBA
  const tol2 = TOL * TOL;

  // สีพื้นหลัง: เฉลี่ยจาก 4 มุม
  const corners = [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]];
  let br = 0, bg = 0, bb = 0;
  for (const [x, y] of corners) {
    const i = (y * W + x) * channels;
    br += data[i]; bg += data[i + 1]; bb += data[i + 2];
  }
  br /= 4; bg /= 4; bb /= 4;

  // flood fill จากทุกพิกเซลขอบ
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

  // หา bbox ของพิกเซลทึบ เพื่อ trim
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (alpha[y * W + x] > 16) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  const pad = 8;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(W - 1, maxX + pad); maxY = Math.min(H - 1, maxY + pad);
  const cw = maxX - minX + 1, ch = maxY - minY + 1;

  const outPath = path.join(OUT, `${name}.png`);
  await sharp(data, { raw: { width: W, height: H, channels } })
    .extract({ left: minX, top: minY, width: cw, height: ch })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  return { name, w: cw, h: ch };
}

(async () => {
  for (const sheet of SHEETS) {
    const src = path.join(ROOT, sheet.file);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const idx = row * 3 + col;
        const name = sheet.names[idx];
        const cell = await sharp(src)
          .extract({ left: col * CELL_W, top: row * CELL_H, width: CELL_W, height: CHAR_H })
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        const r = await processCell(cell.data, cell.info, name);
        console.log("✓", r.name.padEnd(12), r.w + "x" + r.h);
      }
    }
  }
  console.log("\nเสร็จ → public/images/mascot/");
})();
