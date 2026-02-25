const { createCanvas, loadImage, registerFont } = require("canvas");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Register Hindi font
registerFont(path.join(__dirname, "fonts/NotoSansDevanagari-Regular.ttf"), {
  family: "NotoDeva"
});

const W = 1080, H = 1920;

// Inputs from GitHub Actions
const rawUpdates = [
  process.env.U1,
  process.env.U2,
  process.env.U3,
  process.env.U4,
  process.env.U5
].filter(Boolean);

if (rawUpdates.length === 0) {
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

// Prepare folders
fs.mkdirSync("temp/slides", { recursive: true });
fs.mkdirSync("output", { recursive: true });

(async () => {
  const bg = await loadImage(path.join(__dirname, "templates/bg.png"));

  for (let i = 0; i < updates.length; i++) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    // Draw background
    ctx.drawImage(bg, 0, 0, W, H);

    // Draw content
    drawSlide(ctx, updates[i]);

    // Save slide
    fs.writeFileSync(`temp/slides/slide${i + 1}.png`, canvas.toBuffer("image/png"));
  }

  // 3 sec per slide => 1 image per 3 sec => fps = 0.333
  const cmd = `ffmpeg -y -r 0.333 -i temp/slides/slide%d.png -i music/bg.mp3 -c:v libx264 -r 30 -pix_fmt yuv420p -shortest output/reel.mp4`;
  execSync(cmd, { stdio: "inherit" });

  console.log("Video generated: output/reel.mp4");
})();

// ---------- Drawing ----------

function drawSlide(ctx, data) {
  const centerX = W / 2;
  const maxWidth = 760;

  // Start Y inside your BG safe box (adjust if needed)
  let y = 620;

  ctx.textAlign = "center";

  // 1) Title
  ctx.fillStyle = "#0b2a5b"; // dark blue
  ctx.font = "bold 60px NotoDeva";
  y = drawWrappedBlock(ctx, data.title, centerX, y, maxWidth, 78);

  // Gap
  y += 20;

  // 2) Qualification
  if (data.qual) {
    ctx.fillStyle = "#4b5563"; // soft grey
    ctx.font = "bold 40px NotoDeva";
    y = drawWrappedBlock(ctx, data.qual, centerX, y, maxWidth, 56);
    y += 28;
  }

  // 3) Dates
  if (data.dates && data.dates.length) {
    ctx.fillStyle = "#0f766e"; // soft green
    ctx.font = "bold 42px NotoDeva";
    for (const line of data.dates) {
      y = drawWrappedBlock(ctx, line, centerX, y, maxWidth, 58);
      y += 10;
    }
  }
}

// Draw wrapped text block and return next Y (no overlap)
function drawWrappedBlock(ctx, text, x, startY, maxWidth, lineHeight) {
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
  return y + lineHeight; // return next safe Y
}