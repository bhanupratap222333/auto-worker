const { createCanvas, loadImage, registerFont } = require("canvas");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Register Hindi font (use your actual filename)
registerFont(path.join(__dirname, "fonts/NotoSansDevanagari-Regular.ttf"), {
  family: "NotoDeva"
});

const W = 1080, H = 1920;

// Inputs
const rawUpdates = [
  process.env.U1,
  process.env.U2,
  process.env.U3,
  process.env.U4,
  process.env.U5
].filter(Boolean);

if (!rawUpdates.length) {
  console.error("No updates provided");
  process.exit(1);
}

// Parse: "Title | Qualification | Dates"
const updates = rawUpdates.map(u => {
  const parts = u.split("|").map(s => s.trim());
  return {
    title: parts[0] || "",
    qual: parts[1] || "",
    dates: parts[2] ? parts[2].split("→").map(s => s.trim()) : []
  };
});

fs.mkdirSync("temp/slides", { recursive: true });
fs.mkdirSync("output", { recursive: true });

(async () => {
  const bg = await loadImage(path.join(__dirname, "templates/bg.png"));

  for (let i = 0; i < updates.length; i++) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    // Background
    ctx.drawImage(bg, 0, 0, W, H);

    // Draw clean card
    drawCleanSlide(ctx, updates[i]);

    // Save slide
    fs.writeFileSync(`temp/slides/slide${i + 1}.png`, canvas.toBuffer("image/png"));
  }

  // 3 sec per slide => fps 0.333
  const cmd = `ffmpeg -y -r 0.333 -i temp/slides/slide%d.png -i music/bg.mp3 -c:v libx264 -r 30 -pix_fmt yuv420p -shortest output/reel.mp4`;
  execSync(cmd, { stdio: "inherit" });

  console.log("Video generated: output/reel.mp4");
})();

// ---------------- Drawing ----------------

function drawCleanSlide(ctx, data) {
  const centerX = W / 2;
  const cardW = 820;
  const maxTextW = 760;

  // Build blocks
  const blocks = [];
  blocks.push({ text: data.title, size: 60, lh: 78, color: "#0b2a5b", weight: "bold" });
  if (data.qual) blocks.push({ text: data.qual, size: 40, lh: 56, color: "#4b5563", weight: "bold" });
  if (data.dates && data.dates.length) {
    data.dates.forEach(d => blocks.push({ text: d, size: 42, lh: 58, color: "#0f766e", weight: "bold" }));
  }

  // Measure content height
  ctx.textAlign = "center";
  let contentH = 0;
  for (const b of blocks) {
    ctx.font = `${b.weight} ${b.size}px NotoDeva`;
    contentH += measureWrappedHeight(ctx, b.text, maxTextW, b.lh) + 10;
  }
  contentH += 40; // inner padding

  // Safe area (according to your BG)
  const safeTop = 520;
  const safeBottom = 1400;
  const safeH = safeBottom - safeTop;

  const cardH = Math.min(Math.max(contentH, 360), 760);
  const cardX = (W - cardW) / 2;
  const cardY = safeTop + (safeH - cardH) / 2;

  // Draw soft glass card
  roundRect(ctx, cardX, cardY, cardW, cardH, 28, "rgba(255,255,255,0.14)");

  // Draw text centered inside card
  let y = cardY + (cardH - contentH) / 2 + 30;

  for (const b of blocks) {
    ctx.fillStyle = b.color;
    ctx.font = `${b.weight} ${b.size}px NotoDeva`;
    y = drawWrapped(ctx, b.text, centerX, y, maxTextW, b.lh) + 12;
  }
}

function roundRect(ctx, x, y, w, h, r, fillStyle) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function drawWrapped(ctx, text, x, startY, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let y = startY;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, y);
      line = words[n] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, y);
  return y + lineHeight;
}

function measureWrappedHeight(ctx, text, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let lines = 1;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      lines++;
      line = words[n] + " ";
    } else {
      line = testLine;
    }
  }
  return lines * lineHeight;
}
