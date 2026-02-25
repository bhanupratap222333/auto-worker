const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const W = 1080, H = 1920;

// Inputs from GitHub Actions (5 updates)
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

// Parse inputs: "Title | Qualification | Dates"
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

    // Draw content in safe box
    drawSlide(ctx, updates[i].title, updates[i].qual, updates[i].dates);

    // Save slide
    fs.writeFileSync(`temp/slides/slide${i + 1}.png`, canvas.toBuffer("image/png"));
  }

  // 3 seconds per slide => input fps = 1/3 = 0.333
  const cmd = `ffmpeg -y -r 0.333 -i temp/slides/slide%d.png -i music/bg.mp3 -c:v libx264 -r 30 -pix_fmt yuv420p -shortest output/reel.mp4`;
  execSync(cmd, { stdio: "inherit" });

  console.log("Video generated: output/reel.mp4");
})();

// ---------- Drawing Helpers ----------

function drawSlide(ctx, title, qual, dateLines) {
  const centerX = W / 2;

  // Safe box area approx (your BG center panel)
  let y = 620; // start Y inside box
  const maxWidth = 760;

  // Title
  ctx.textAlign = "center";
  ctx.fillStyle = "#0b2a5b"; // dark blue
  ctx.font = "bold 64px Arial";
  y = wrapText(ctx, title, centerX, y, maxWidth, 80) + 20;

  // Qualification
  if (qual) {
    ctx.fillStyle = "#4b5563"; // soft grey
    ctx.font = "bold 42px Arial";
    y = wrapText(ctx, qual, centerX, y, maxWidth, 60) + 30;
  }

  // Dates
  if (dateLines && dateLines.length) {
    ctx.fillStyle = "#0f766e"; // soft green/teal
    ctx.font = "bold 44px Arial";
    for (const line of dateLines) {
      y = wrapText(ctx, line, centerX, y, maxWidth, 60) + 10;
    }
  }
}

// Auto wrap text and return last Y
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let yy = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, yy);
      line = words[n] + " ";
      yy += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, yy);
  return yy;
}
