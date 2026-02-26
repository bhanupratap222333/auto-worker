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

    // Draw text directly on BG box
    drawTextBlock(ctx, updates[i]);

    // Save slide
    fs.writeFileSync(`temp/slides/slide${i + 1}.png`, canvas.toBuffer("image/png"));
  }

  // 3 sec per slide => fps 0.333
  const cmd = `ffmpeg -y -r 0.333 -i temp/slides/slide%d.png -i music/bg.mp3 -c:v libx264 -r 30 -pix_fmt yuv420p -shortest output/reel.mp4`;
  execSync(cmd, { stdio: "inherit" });

  console.log("Video generated: output/reel.mp4");
})();

// ---------------- Drawing ----------------

function drawTextBlock(ctx, data) {
  const centerX = W / 2;

  // This width controls left-right padding.
  // Assume your BG box is ~800px wide, keep 20px padding on both sides.
  const boxInnerWidth = 760; // ~800 - 20 - 20

  // Build blocks (bigger & bold title)
  const blocks = [];
  blocks.push({ text: data.title, size: 66, lh: 84, color: "#000000", weight: "900" }); // Title bigger & bolder
  if (data.qual) blocks.push({ text: data.qual, size: 42, lh: 60, color: "#4b5563", weight: "700" });
  if (data.dates && data.dates.length) {
    data.dates.forEach(d => blocks.push({ text: d, size: 46, lh: 64, color: "#155836", weight: "700" }));
  }

  // Measure total content height to center vertically in box
  ctx.textAlign = "center";
  let contentH = 0;
  for (const b of blocks) {
    ctx.font = `${b.weight} ${b.size}px NotoDeva`;
    contentH += measureWrappedHeight(ctx, b.text, boxInnerWidth, b.lh) + 16; // gap between blocks
  }

  // Your BG box vertical safe area (adjust if needed)
  const safeTop = 520;
  const safeBottom = 1400;
  const safeH = safeBottom - safeTop;

  // Start Y so that block is centered vertically in the box
  let y = safeTop + (safeH - contentH) / 2;

  // Draw blocks
  for (const b of blocks) {
    ctx.fillStyle = b.color;
    ctx.font = `${b.weight} ${b.size}px NotoDeva`;
    y = drawWrapped(ctx, b.text, centerX, y, boxInnerWidth, b.lh) + 18; // vertical gap between sections
  }
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
