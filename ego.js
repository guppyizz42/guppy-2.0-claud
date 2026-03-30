let eStream = null;

window.toggleEgo = async () => {
    if (eStream) { window.stopEgo(); return; }

    try {
        eStream = await navigator.mediaDevices.getUserMedia({ video: true });

        /* FULLSCREEN STYLES */
        const style = document.createElement('style');
        style.id = "ego-clean-melt";
        style.innerHTML = `
            body.ego-active {
                margin: 0;
                overflow: hidden;
                background: black;
            }

            #ego-container {
                position: fixed;
                inset: 0;
                width: 100vw;
                height: 100vh;
                z-index: 9999;
                overflow: hidden;
            }

            #ego-vid {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                transform: scaleX(-1);
                filter: url(#ego-melt);
            }

            /* SUBTLE COLOR FLOW */
            .ego-overlay {
                position: absolute;
                inset: 0;
                background: linear-gradient(
                    120deg,
                    rgba(255,0,150,0.08),
                    rgba(0,255,255,0.08),
                    rgba(255,255,0,0.08)
                );
                mix-blend-mode: screen;
                animation: hueShift 12s linear infinite;
                pointer-events: none;
            }

            @keyframes hueShift {
                from { filter: hue-rotate(0deg); }
                to { filter: hue-rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        /* MELT FILTER */
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.style.position = "absolute";
        svg.style.width = 0;

        svg.innerHTML = `
            <filter id="ego-melt">
                <feTurbulence 
                    type="fractalNoise" 
                    baseFrequency="0.003 0.006" 
                    numOctaves="2"
                    seed="3">
                    <animate 
                        attributeName="baseFrequency"
                        dur="8s"
                        values="0.003 0.006; 0.006 0.01; 0.003 0.006"
                        repeatCount="indefinite"/>
                </feTurbulence>

                <feDisplacementMap 
                    in="SourceGraphic" 
                    scale="35" />
            </filter>
        `;
        document.body.appendChild(svg);

        /* CONTAINER */
        const container = document.createElement('div');
        container.id = "ego-container";

        /* VIDEO */
        const v = document.createElement('video');
        v.id = "ego-vid";
        v.srcObject = eStream;
        v.autoplay = true;
        v.muted = true;

        /* OVERLAY */
        const overlay = document.createElement('div');
        overlay.className = "ego-overlay";

        container.appendChild(v);
        container.appendChild(overlay);
        document.body.appendChild(container);

        document.body.classList.add('ego-active');

        /* HIDE UI */
        const msgs = document.getElementById('messages');
        if (msgs) msgs.style.visibility = 'hidden';

    } catch (e) {
        console.error(e);
        alert("Camera required.");
    }
};

window.stopEgo = () => {
    if (eStream) eStream.getTracks().forEach(t => t.stop());
    eStream = null;

    document.getElementById('ego-container')?.remove();
    document.getElementById('ego-clean-melt')?.remove();
    document.querySelector('svg')?.remove();

    document.body.classList.remove('ego-active');

    const msgs = document.getElementById('messages');
    if (msgs) msgs.style.visibility = 'visible';
};

window.addEventListener('stop-all-activities', window.stopEgo);
