/**
 * GUPPY | MEDIA ENGINE v5.0
 *
 * Text mode  — no auto media. Video call button rings stranger, they accept/decline.
 * Voice mode — audio auto-starts on match. Video call button upgrades to video.
 * Video mode — audio+video auto-starts on match. No video call button shown.
 *
 * window.isOfferer (set by server via client.js) controls who sends the offer.
 * This prevents the double-offer collision that silently kills audio.
 */

let localStream = null;
let peerConnection = null;
let isMuted = false;
let isRinging = false; // prevents double-tap on video call button

const iceConfig = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

// ─────────────────────────────────────────────
// START MEDIA
// Called by client.js on match (voice/video)
// or by video-call-start event (text/voice upgrade)
// ─────────────────────────────────────────────

window.startMedia = async function(useVideo = false) {
    try {
        // Clean up any existing stream
        if (localStream) {
            localStream.getTracks().forEach(t => t.stop());
            localStream = null;
        }

        localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: useVideo ? { width: 1280, height: 720 } : false
        });

        updateVoiceUI(useVideo ? '🟢 VIDEO_ACTIVE' : '🎙️ VOICE_ACTIVE');
        if (useVideo) showLocalPreview(localStream);

        // Close old peer connection (e.g. upgrading voice → video)
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }

        createPeerConnection();

        // addTrack() implicitly creates transceivers.
        // Do NOT also call addTransceiver() — that doubles the m= lines in SDP.
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Only the designated offerer sends the offer.
        // The answerer waits for the offer via webrtc-signal.
        if (window.isOfferer) {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            window.socket.emit('webrtc-signal', {
                type: 'offer',
                sdp: offer,
                useVideo
            });
        }

    } catch (err) {
        console.error('Media Error:', err);
        updateVoiceUI('❌ HARDWARE_ERROR');
        isRinging = false;
    }
};

// ─────────────────────────────────────────────
// VIDEO CALL BUTTON (text & voice modes)
// Sends a ring to the stranger
// ─────────────────────────────────────────────

window.requestVideo = function() {
    if (isRinging) return;
    isRinging = true;
    window.socket.emit('video-ring');
    updateVoiceUI('📞 RINGING...');
    if (window.addMessage) window.addMessage('Waiting for stranger to accept video call...', 'system');
};

// ─────────────────────────────────────────────
// ACCEPT / DECLINE (stranger's side)
// ─────────────────────────────────────────────

window.acceptCall = function() {
    const overlay = document.getElementById('call-overlay');
    if (overlay) overlay.style.display = 'none';
    // Tell server we accepted — server will send video-call-start to both sides
    // with correct isOfferer values. startMedia() fires from client.js handler.
    window.socket.emit('video-accepted');
};

window.denyCall = function() {
    const overlay = document.getElementById('call-overlay');
    if (overlay) overlay.style.display = 'none';
    window.socket.emit('video-declined');
};

// ─────────────────────────────────────────────
// PEER CONNECTION — no addTransceiver calls
// ─────────────────────────────────────────────

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(iceConfig);

    peerConnection.ontrack = (event) => {
        const stream = event.streams[0];
        const remoteAudio = document.getElementById('remote-audio');

        if (remoteAudio) {
            remoteAudio.srcObject = stream;
            remoteAudio.play().catch(err => {
                console.warn('Autoplay blocked:', err);
                updateVoiceUI('⚠️ CLICK TO UNMUTE');
            });
        }

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

    peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        if (state === 'disconnected' || state === 'failed') {
            window.stopMedia();
        }
    };
}

// ─────────────────────────────────────────────
// SIGNALING HANDLER
// ─────────────────────────────────────────────

window.socket.on('webrtc-signal', async (data) => {
    try {
        if (!peerConnection) createPeerConnection();

        if (data.type === 'offer') {
            await peerConnection.setRemoteDescription(
                new RTCSessionDescription(data.sdp)
            );

            // Answerer gets their own media if not already running
            if (!localStream) {
                localStream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: data.useVideo ? { width: 1280, height: 720 } : false
                });
                localStream.getTracks().forEach(track => {
                    peerConnection.addTrack(track, localStream);
                });
                if (data.useVideo) showLocalPreview(localStream);
                updateVoiceUI(data.useVideo ? '🟢 VIDEO_ACTIVE' : '🎙️ VOICE_ACTIVE');
            }

            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            window.socket.emit('webrtc-signal', { type: 'answer', sdp: answer });
            isRinging = false;

        } else if (data.type === 'answer') {
            await peerConnection.setRemoteDescription(
                new RTCSessionDescription(data.sdp)
            );
            isRinging = false;

        } else if (data.type === 'ice') {
            await peerConnection.addIceCandidate(
                new RTCIceCandidate(data.candidate)
            );
        }
    } catch (e) {
        console.warn('Signaling Error:', e);
    }
});

// ─────────────────────────────────────────────
// MUTE TOGGLE
// ─────────────────────────────────────────────

window.toggleMute = function() {
    if (!localStream) return;
    isMuted = !isMuted;
    localStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
    const btn = document.getElementById('mute-btn');
    if (btn) btn.innerText = isMuted ? '🔈 Unmute' : '🔇 Mute';
};

// ─────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────

window.stopMedia = function() {
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (peerConnection) peerConnection.close();

    const rv = document.getElementById('remote-video');
    const lv = document.getElementById('local-video-preview');
    if (rv) rv.remove();
    if (lv) lv.remove();

    localStream = null;
    peerConnection = null;
    isMuted = false;
    isRinging = false;

    updateVoiceUI('⚪ OFFLINE');
    stopWaveAnimation();
};

// ─────────────────────────────────────────────
// UI HELPERS
// ─────────────────────────────────────────────

function displayRemoteVideo(stream) {
    let rv = document.getElementById('remote-video');
    if (!rv) {
        rv = document.createElement('video');
        rv.id = 'remote-video';
        rv.autoplay = true;
        rv.playsinline = true;
        document.querySelector('.chat-area').appendChild(rv);
    }
    rv.srcObject = stream;
}

function showLocalPreview(stream) {
    let lv = document.getElementById('local-video-preview');
    if (!lv) {
        lv = document.createElement('video');
        lv.id = 'local-video-preview';
        lv.autoplay = true;
        lv.muted = true; // always muted to prevent feedback
        lv.playsinline = true;
        document.querySelector('.sidebar').appendChild(lv);
    }
    lv.srcObject = stream;
}

function updateVoiceUI(txt) {
    const label = document.getElementById('voice-state-label');
    if (label) label.innerText = txt;
}

function startWaveAnimation() {
    document.querySelectorAll('.wave-bar').forEach(b => b.classList.add('active'));
}

function stopWaveAnimation() {
    document.querySelectorAll('.wave-bar').forEach(b => b.classList.remove('active'));
}

window.addEventListener('stop-all-activities', window.stopMedia);
