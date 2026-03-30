window.socket = io();
window.peer = new Peer();
window.partnerPeerId = null;
window.currentMode = 'text';  
window.isOfferer = false;     

window.peer.on('open', (id) => window.socket.emit('authenticate', { peerId: id }));

window.socket.on('update-count', c => {
    const el = document.getElementById('count');
    if (el) el.innerText = c;
});

window.joinQueue = (mode) => {
    // Vibe: Play a subtle click sound when choosing a node
    if (window.playSound) window.playSound('click');
    
    window.socket.emit('find-match', { mode });
    window.currentMode = mode; // Pre-set mode for UI responsiveness

    const m = document.getElementById('messages');
    if (m) m.innerHTML = `<div class="system">Searching for ${mode} partner...</div>`;

    const sc = document.getElementById('start-controls');
    const ac = document.getElementById('active-controls');
    
    if (sc) sc.style.display = 'none';
    if (ac) {
        ac.style.display = 'flex';
        // UI Fix: Hide video call button if we are ALREADY in video mode
        const vcBtn = document.getElementById('video-call-btn');
        if (vcBtn) vcBtn.style.display = mode === 'video' ? 'none' : 'block';
    }
};

window.socket.on('match-found', (data) => {
    // Clean up plugins (Rainbow Void, Ego, Arcade) to save M1 CPU for Video
    if (window.stopVoid) window.stopVoid();
    if (window.stopEgo) window.stopEgo();
    if (window.stopGame) window.stopGame();

    window.partnerPeerId = data.peerId;
    window.currentMode = data.mode;
    window.isOfferer = data.isOfferer;

    const m = document.getElementById('messages');
    const inp = document.getElementById('chat-input');
    
    if (m) m.innerHTML = '<div class="system">Stranger connected!</div>';
    if (inp) { inp.disabled = false; inp.focus(); }

    // THE CORE LOGIC:
    if (data.mode === 'voice') {
        // Voice Node: Mic on, no camera.
        window.startMedia(false); 
    } else if (data.mode === 'video') {
        // Video Node: Instant Camera + Mic.
        if (m) m.innerHTML += '<div class="system">Initializing Video Node...</div>';
        window.startMedia(true); 
    }
});

// --- VIDEO RING FLOW (For Text/Voice Nodes) ---

window.socket.on('video-ring', () => {
    // Spiritual Vibe: Maybe play a low hum here?
    const overlay = document.getElementById('call-overlay');
    if (overlay) overlay.style.display = 'flex';
});

window.socket.on('video-call-start', (data) => {
    const overlay = document.getElementById('call-overlay');
    if (overlay) overlay.style.display = 'none';
    
    window.isOfferer = data.isOfferer;
    window.startMedia(true); // Upgrade current connection to video
});

window.socket.on('video-declined', () => {
    addMessage('Stranger declined the video call.', 'system');
    if (window.currentMode === 'voice') {
        const label = document.getElementById('voice-state-label');
        if (label) label.innerText = '🎙️ VOICE_ACTIVE';
    }
});

// --- BASIC CHAT & NAVIGATION ---

window.sendMessage = function() {
    const input = document.getElementById('chat-input');
    if (input && input.value.trim()) {
        window.socket.emit('send-msg', input.value);
        addMessage(input.value, 'me');
        input.value = '';
    }
};

window.socket.on('receive-msg', m => {
    addMessage(m, 'stranger');
    // Subtle vibe: play glitch sound on incoming msg
    if (window.playSound) window.playSound('glitch');
});

window.socket.on('stranger-left', () => {
    // Death Vibe: Play death moan when partner leaves
    if (window.playSound) window.playSound('hit');
    
    addMessage('Stranger disconnected.', 'system');
    setTimeout(() => location.reload(), 1500);
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.handleSkip();
});

window.handleSkip = function() {
    window.socket.emit('leave-chat');
    location.reload();
};

function addMessage(text, type) {
    const m = document.getElementById('messages');
    if (!m) return;
    const div = document.createElement('div');
    div.className = `msg ${type}`;
    div.innerText = text;
    m.appendChild(div);
    m.scrollTop = m.scrollHeight;
}

window.addMessage = addMessage;
