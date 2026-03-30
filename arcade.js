/**
 * GUPPY | ARCADE ULTRA
 * Features: Parallax Background, Particle Death, CRT Overlay, and Score.
 */

let gameInterval = null;
let canvas = null;
let ctx = null;

// Game State
let fish = { x: 50, y: 150, v: 0, gravity: 0.6, lift: -10, size: 20 };
let blocks = [];
let particles = [];
let bgStars = [];
let frameCount = 0;
let score = 0;
let highScore = localStorage.getItem('guppy-high-score') || 0;
let isGameOver = false;
let gameSpeed = 3;

window.toggleGame = function() {
    const chatArea = document.querySelector('.chat-area');
    if (document.getElementById('arcade-canvas')) { window.stopGame(); return; }

    canvas = document.createElement('canvas');
    canvas.id = 'arcade-canvas';
    canvas.width = chatArea.clientWidth;
    canvas.height = chatArea.clientHeight;
    canvas.style.position = 'absolute';
    canvas.style.top = '0'; canvas.style.left = '0';
    canvas.style.zIndex = '100'; canvas.style.background = '#000';
    chatArea.appendChild(canvas);
    ctx = canvas.getContext('2d');

    // Init Parallax Background
    for(let i=0; i<50; i++) {
        bgStars.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, s: Math.random()*2 });
    }

    resetGameState();
    document.getElementById('messages').style.visibility = 'hidden';
    window.addEventListener('keydown', handleInput);
    gameInterval = setInterval(drawGame, 1000 / 60); 
};

function resetGameState() {
    isGameOver = false; fish.y = canvas.height/2; fish.v = 0;
    blocks = []; particles = []; frameCount = 0; score = 0; gameSpeed = 3;
}

function handleInput(e) { if (e.code === "Space") { fish.v = fish.lift; e.preventDefault(); } }

function drawGame() {
    if (isGameOver) { renderDeath(); return; }

    // 1. Physics
    fish.v += fish.gravity; fish.y += fish.v;
    if (frameCount % 600 === 0) gameSpeed += 0.5;

    // 2. Generate Obstacles
    if (frameCount % 100 === 0) {
        const gap = 140;
        const h = Math.random() * (canvas.height - 300) + 50;
        blocks.push({ x: canvas.width, y: 0, w: 50, h: h, p: false });
        blocks.push({ x: canvas.width, y: h + gap, w: 50, h: canvas.height, p: false });
    }

    // 3. Render Loop
    ctx.fillStyle = "#0a0a08"; // Dull beige-black background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Parallax Stars
    ctx.fillStyle = "#2a2a24";
    bgStars.forEach(s => {
        s.x -= (gameSpeed * 0.2);
        if (s.x < 0) s.x = canvas.width;
        ctx.fillRect(s.x, s.y, s.s, s.s);
    });

    // Draw Blocks with "Industrial" glow
    ctx.fillStyle = "#39ff14";
    ctx.shadowBlur = 10; ctx.shadowColor = "#39ff14";
    blocks.forEach((b, i) => {
        b.x -= gameSpeed;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        
        // Collision & Scoring
        if (fish.x + 15 > b.x && fish.x < b.x + b.w && fish.y + 5 > b.y && fish.y < b.y + b.h) endGame();
        if (!b.p && b.x < fish.x) { b.p = true; if (i%2==0) score++; }
    });
    ctx.shadowBlur = 0;

    // Draw Fish & UI
    ctx.font = "24px monospace"; ctx.fillText("🐟", fish.x, fish.y);
    ctx.fillStyle = "#39ff14"; ctx.font = "10px monospace";
    ctx.fillText(`[NODES_CLEARED: ${score}]`, 20, 30);
    ctx.fillText(`[MAX_STABILITY: ${highScore}]`, 20, 45);

    if (fish.y > canvas.height || fish.y < 0) endGame();
    frameCount++;
}

function renderDeath() {
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.a -= 0.02;
        ctx.fillStyle = `rgba(57, 255, 20, ${p.a})`;
        ctx.fillRect(p.x, p.y, 2, 2);
    });
}

function endGame() {
    if (isGameOver) return;
    isGameOver = true;
    for(let i=0; i<20; i++) {
        particles.push({ x: fish.x, y: fish.y, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, a: 1 });
    }
    if (score > highScore) localStorage.setItem('guppy-high-score', score);
    if (window.addMessage) window.addMessage(`SYSTEM ERROR: Node Collapsed. Score: ${score}`, "system");
    setTimeout(window.stopGame, 2000);
}

window.stopGame = function() {
    clearInterval(gameInterval);
    const c = document.getElementById('arcade-canvas');
    if (c) c.remove();
    document.getElementById('messages').style.visibility = 'visible';
    window.removeEventListener('keydown', handleInput);
};
window.addEventListener('stop-all-activities', window.stopGame);
