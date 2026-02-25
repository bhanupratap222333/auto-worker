const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const W = 1080, H = 1920;

// Inputs from GitHub Actions
const updates = [
  process.env.U1,
  process.env.U2,
  process.env.U3,
  process.env.U4,
  process.env.U5
].filter(Boolean);

if (updates.length === 0) {
  console.error("No updates provided");
  process.exit(1);
}

fs.mkdirSync("temp/slides", { recursive: true });
fs.mkdirSync("output", { recursive: true });

(async () => {
  const bg = await loadImage(path.join(__dirname, "templates/bg.png"));

  for (let i = 0; i < updates.length; i++) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    // Background
    ctx.drawImage(bg, 0, 0, W, H);

    // Text style
    ctx.fillStyle = "#0b1a33";
    ctx.textAlign = "center";
    ctx.font = "bold 72px Arial";

    const x = W / 2;
    const startY = 700;

    wrapText(ctx, `${i + 1}. ${updates[i]}`, x, startY, 800, 90);

    fs.writeFileSync(`temp/slides/slide${i + 1}.png`, canvas.toBuffer("image/png"));
  }

  // Make video (1 sec per slide)
  const cmd = `ffmpeg -y -r 1 -i temp/slides/slide%d.png -i music/bg.mp3 -c:v libx264 -r 30 -pix_fmt yuv420p -shortest output/reel.mp4`;
  execSync(cmd, { stdio: "inherit" });

  console.log("Video generated: output/reel.mp4");
})();

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
}