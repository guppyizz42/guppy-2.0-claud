/**
 * GUPPY | VOID ENGINE v2.0 (HAUNTED EDITION)
 * Features: Mouse-Reactive Warp, Chromatic Ghosting, and Reality Collapse.
 */

const ANCIENT_SCRIPTS = [
    "अहं ब्रह्मास्मि", "ॐ मणि पद्मे हूँ", "קדש קדש קדש", 
    "तत्त्वमसि", "שמע ישראל", "𐤀𐤋𐤕 𐤌𐤔𐤕", "ओं शान्तिः",
    "NETI NETI", "VOID_DETECTED", "01001111 01001101"
];

let shlokaInterval = null;
let patternInterval = null;
let currentPhase = 0;

window.toggleVoid = function() {
    const isEnabling = !document.body.classList.contains('void-enabled');
    document.body.classList.toggle('void-enabled');

    if (isEnabling) {
        console.log("%c [VOID_DISSOLUTION_START] ", "background: #000; color: #ff0000; font-weight: bold;");
        
        // 1. Shloka Ghosting
        rotateShlokas();
        shlokaInterval = setInterval(rotateShlokas, 3000); 
        
        // 2. Pattern Morphing
        cyclePatterns();
        patternInterval = setInterval(cyclePatterns, 2500); 

        // 3. Mouse Interaction (Frequency Modulation)
        document.addEventListener('mousemove', handleVoidMouse);
        
    } else {
        window.stopVoid();
    }
};

function handleVoidMouse(e) {
    if (!document.body.classList.contains('void-enabled')) return;
    const turb = document.getElementById('turbulence');
    if (turb) {
        // Map mouse X to baseFrequency (The "Vibration" of the Void)
        const freq = (e.clientX / window.innerWidth) * 0.07;
        turb.setAttribute('baseFrequency', freq.toFixed(4));
        
        // Map mouse Y to scale (The "Depth" of the Melt)
        const map = document.querySelector('feDisplacementMap');
        if (map) map.setAttribute('scale', (e.clientY / window.innerHeight) * 200);
    }
}

function cyclePatterns() {
    const tunnel = document.getElementById('void-tunnel');
    const app = document.getElementById('app');
    const turb = document.getElementById('turbulence');
    
    if (!tunnel) return;

    tunnel.className = '';
    currentPhase = (currentPhase % 5) + 1; // 5 Phases now
    tunnel.classList.add('phase-' + currentPhase);
    
    // PHASE 5: REALITY COLLAPSE (The "Scary" one)
    if (currentPhase === 5) {
        app.style.filter = "url(#fractal-warp) invert(1) contrast(300%)";
        document.body.style.backgroundColor = "#1a0000"; // Deep blood red shift
        setTimeout(() => { 
            if(currentPhase === 5) app.style.filter = "url(#fractal-warp)";
        }, 500);
    } else {
        app.style.filter = "none";
        document.body.style.backgroundColor = "#000";
    }

    if (turb) turb.setAttribute('seed', Math.floor(Math.random() * 5000));
}

function rotateShlokas() {
    const overlay = document.getElementById('void-text-overlay');
    if (!overlay) return;

    const text = ANCIENT_SCRIPTS[Math.floor(Math.random() * ANCIENT_SCRIPTS.length)];
    
    // Create Chromatic Ghosting (3 layers of text)
    overlay.innerHTML = `
        <div class="glitch-wrapper">
            <span class="g-layer r">${text}</span>
            <span class="g-layer g">${text}</span>
            <span class="g-layer b">${text}</span>
        </div>
    `;
}

window.stopVoid = function() {
    document.body.classList.remove('void-enabled');
    document.getElementById('app').style.filter = "none";
    document.body.style.backgroundColor = "#000";
    
    if (shlokaInterval) clearInterval(shlokaInterval);
    if (patternInterval) clearInterval(patternInterval);
    document.removeEventListener('mousemove', handleVoidMouse);

    const overlay = document.getElementById('void-text-overlay');
    if (overlay) overlay.innerText = "";
    console.log("%c [VOID_STABILIZED] ", "color: #444;");
};

window.addEventListener('stop-all-activities', window.stopVoid);
