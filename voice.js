/**
 * GUPPY | MEDIA ENGINE v5.1 (STABLE)
 * Instant Video for Video Nodes | Independent Voice Routing.
 */

let localStream = null;
let peerConnection = null;
let isMuted = false;

const iceConfig = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

// --- HANDSHAKE LOGIC (For Text/Voice Nodes) ---
window.requestVideo = () => {
    window.socket.emit('video-request');
    if (window.addMessage) window.addMessage("SYSTEM: Video request sent...", "system");
};

window.acceptCall = () => {
    const overlay = document.getElementById('call-overlay');
    if (overlay) overlay.style.display = 'none';
    window.startMedia(true); 
    window.socket.emit('video-accepted');
};

// --- 1. START MEDIA ---
window.startMedia = async function(useVideo = false) {
    try {
        if (localStream) localStream.getTracks().forEach(t => t.stop());

        // M1 Optimized constraints
        localStream = await navigator.mediaDevices.getUserMedia({ 
            audio: true, 
            video: useVideo ? { width: 1280, height: 720, facingMode: "user" } : false 
        });

        updateVoiceUI(useVideo ? '🟢 VIDEO_ACTIVE' : '🎙️ VOICE_ACTIVE');
        if (useVideo) showLocalPreview(localStream);

        if (peerConnection) peerConnection.close();
        createPeerConnection(useVideo);

        // Add tracks to connection
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Negotiate with specific intent
        const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: useVideo 
        });
        await peerConnection.setLocalDescription(offer);
        
        window.socket.emit('webrtc-signal', { 
            type: 'offer', 
            sdp: offer, 
            useVideo: useVideo 
        });

    } catch (err) {
        console.error("Hardware Error:", err);
        updateVoiceUI('❌ HARDWARE_ERROR');
    }
};

// --- 2. CREATE PEER CONNECTION ---
function createPeerConnection(useVideo) {
    peerConnection = new RTCPeerConnection(iceConfig);

    // FIX: Pre-configure transceivers so Voice Node doesn't wait for Video sync
    peerConnection.addTransceiver('audio', { direction: 'sendrecv' });
    if (useVideo) {
        peerConnection.addTransceiver('video', { direction: 'sendrecv' });
    }

    peerConnection.ontrack = (event) => {
        const stream = event.streams[0];
        const remoteAudio = document.getElementById('remote-audio');

        // ROUTE AUDIO (Priority 1)
        if (remoteAudio) {
            remoteAudio.srcObject = stream;
            // Spiritual Vibe: Auto-resume audio context
            remoteAudio.play().catch(() => console.log("Click UI to hear stranger."));
        }

        // ROUTE VIDEO (Only if track exists)
        if (event.track.kind === 'video') {
            displayRemoteVideo(stream);
        }

        startWaveAnimation();
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            window.socket.emit('webrtc-signal', { type: 'ice', candidate: event.candidate });
        }
    };
}

// --- 3. SIGNALING HANDLER ---
if (window.socket) {
    window.socket.on('webrtc-signal', async (data) => {
        try {
            if (!peerConnection) createPeerConnection(data.useVideo);

            if (data.type === 'offer') {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
                
                if (!localStream) {
                    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: data.useVideo });
                    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
                    if (data.useVideo) showLocalPreview(localStream);
                }

                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                window.socket.emit('webrtc-signal', { type: 'answer', sdp: answer });

            } else if (data.type === 'answer') {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
            } else if (data.type === 'ice') {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        } catch (e) { console.warn(e); }
    });
}

// --- VISUAL UTILITIES ---
function displayRemoteVideo(stream) {
    let rv = document.getElementById('remote-video');
    if (!rv) {
        rv = document.createElement('video');
        rv.id = 'remote-video';
        rv.autoplay = true;
        rv.playsinline = true; 
        const viewport = document.querySelector('.chat-area');
        if (viewport) viewport.appendChild(rv);
    }
    rv.srcObject = stream;
}

function showLocalPreview(stream) {
    let lv = document.getElementById('local-video-preview');
    if (!lv) {
        lv = document.createElement('video');
        lv.id = 'local-video-preview';
        lv.autoplay = true; lv.muted = true; lv.playsinline = true;
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.appendChild(lv);
    }
    lv.srcObject = stream;
}

window.stopMedia = function() {
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (peerConnection) peerConnection.close();
    const rv = document.getElementById('remote-video');
    const lv = document.getElementById('local-video-preview');
    if (rv) rv.remove(); if (lv) lv.remove();
    localStream = null; peerConnection = null;
    updateVoiceUI('⚪ OFFLINE');
    stopWaveAnimation();
};

function toggleMute() {
    if (!localStream) return;
    isMuted = !isMuted;
    localStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
}

function updateVoiceUI(txt) {
    const label = document.getElementById('voice-state-label');
    if (label) label.innerText = txt;
}
function startWaveAnimation() { document.querySelectorAll('.wave-bar').forEach(b => b.classList.add('active')); }
function stopWaveAnimation() { document.querySelectorAll('.wave-bar').forEach(b => b.classList.remove('active')); }

window.addEventListener('stop-all-activities', window.stopMedia);
window.addEventListener('start-voice', () => window.startMedia(false));
window.addEventListener('start-video', () => window.startMedia(true));
