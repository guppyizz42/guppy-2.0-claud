window.socket = io();
window.peer = new Peer();
window.partnerPeerId = null;
window.currentMode = 'text';  // tracked here so voice.js can read it
window.isOfferer = false;     // set by server on match, used by voice.js

window.peer.on('open', (id) => window.socket.emit('authenticate', { peerId: id }));

window.socket.on('update-count', c => {
    const el = document.getElementById('count');
    if (el) el.innerText = c;
});

window.joinQueue = (mode) => {
    window.socket.emit('find-match', { mode });
    const m = document.getElementById('messages');
    if (m) m.innerHTML = '<div class="system">Searching...</div>';

    const sc = document.getElementById('start-controls');
    const ac = document.getElementById('active-controls');
    if (sc) sc.style.display = 'none';
    if (ac) {
        ac.style.display = 'flex';
        // Hide video call button in video mode — already in video, no need
        const vcBtn = document.getElementById('video-call-btn');
        if (vcBtn) vcBtn.style.display = mode === 'video' ? 'none' : 'block';
    }
};

window.socket.on('match-found', (data) => {
    // Stop any active plugins
    if (window.stopVoid) window.stopVoid();
    if (window.stopEgo) window.stopEgo();
    if (window.stopGame) window.stopGame();

    window.partnerPeerId = data.peerId;
    window.currentMode = data.mode;
    window.isOfferer = data.isOfferer;

    const m = document.getElementById('messages');
    const inp = document.getElementById('chat-input');
    if (m) m.innerHTML = '<div class="system">Connected!</div>';
    if (inp) { inp.disabled = false; inp.focus(); }

    // Voice: auto-start audio. Video: auto-start audio+video.
    // Text: do nothing until a video ring is initiated.
    if (data.mode === 'voice') {
        window.startMedia(false);
    } else if (data.mode === 'video') {
        window.startMedia(true);
    }
});

// --- VIDEO RING FLOW ---

// Incoming ring — show accept prompt
window.socket.on('video-ring', () => {
    const overlay = document.getElementById('call-overlay');
    if (overlay) overlay.style.display = 'flex';
});

// Both sides get this after accept — isOfferer tells who makes the offer
window.socket.on('video-call-start', (data) => {
    window.isOfferer = data.isOfferer;
    window.startMedia(true);
});

// Caller hears decline
window.socket.on('video-declined', () => {
    window.isRinging = false;
    addMessage('Stranger declined the video call.', 'system');
    // Restore voice UI state if in voice mode
    if (window.currentMode === 'voice') {
        const label = document.getElementById('voice-state-label');
        if (label) label.innerText = '🎙️ VOICE_ACTIVE';
    }
});

// --- BASIC CHAT ---

window.sendMessage = function() {
    const input = document.getElementById('chat-input');
    if (input && input.value.trim()) {
        window.socket.emit('send-msg', input.value);
        addMessage(input.value, 'me');
        input.value = '';
    }
};

window.socket.on('receive-msg', m => addMessage(m, 'stranger'));

window.socket.on('stranger-left', () => {
    addMessage('Stranger left.', 'system');
    setTimeout(() => location.reload(), 1500);
});

// ESC to skip
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
