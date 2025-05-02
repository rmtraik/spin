// --- Get DOM Elements ---
const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const spinButton = document.getElementById('spinButton');
const participantInput = document.getElementById('participantInput');
const addButton = document.getElementById('addButton');
const clearButton = document.getElementById('clearButton');
const winnerDisplay = document.getElementById('winnerDisplay');
const winnerNameEl = document.getElementById('winnerName');
const participantInfoEl = document.getElementById('participantInfo');
const wheelContainer = document.getElementById('wheelContainer');
const wheelOuterContainer = document.getElementById('wheelOuterContainer');
const participantListDiv = document.getElementById('participantList');
const entriesCountSpan = document.getElementById('entriesCount');
const tickSound = document.getElementById('tickSound');
const winSound = document.getElementById('winSound');

// --- State Variables ---
let participants = [];
let participantColors = {}; // Store assigned colors
let currentAngle = 0; // Current rotation angle of the wheel
let spinSpeed = 0; // Current spin speed
let isSpinning = false; // Flag to indicate if the wheel is currently spinning
const friction = 0.991; // Friction factor to slow down the wheel
const minSpinSpeed = 0.002; // Speed below which the wheel stops
let selectedWinner = null; // Stores the winner after spin stops
let spinTimeout; // Timeout ID for safety stop mechanism
let lastTickAngle = 0; // Tracks the angle for playing tick sounds
let audioUnlocked = false; // Flag for audio context unlock status

// --- Wheel Configuration ---
let canvasSize = 0; // Actual pixel size of the canvas
let WHEEL_CENTER_X = 0; // Center X coordinate of the wheel on canvas
let WHEEL_CENTER_Y = 0; // Center Y coordinate of the wheel on canvas
let WHEEL_RADIUS = 0; // Radius of the wheel on canvas
const POINTER_ANGLE = 0; // Angle where the pointer is located (0 = right)

// --- Color Palette (Vibrant colors like wheelofnames) ---
const VIBRANT_COLORS = [
    '#FBC02D', '#0288D1', '#D32F2F', '#388E3C', '#F57C00',
    '#7B1FA2', '#C2185B', '#00796B', '#5D4037', '#455A64',
    '#FF6F00', '#4CAF50', '#2196F3', '#E91E63', '#673AB7',
    '#00BCD4', '#FFEB3B', '#9C27B0', '#8BC34A', '#FF9800'
];
let nextColorIndex = 0; // Index for assigning next color from palette

// --- Functions ---

/**
 * Assigns a color from the palette to a participant if they don't have one.
 * @param {string} participantName - The name of the participant.
 */
function assignColorToParticipant(participantName) {
    if (!participantColors[participantName]) {
        participantColors[participantName] = VIBRANT_COLORS[nextColorIndex % VIBRANT_COLORS.length];
        nextColorIndex++;
    }
}

/**
 * Renders the list of participants in the designated div.
 */
function renderParticipantList() {
    participantListDiv.innerHTML = ''; // Clear current list
    if (participants.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.textContent = "لا يوجد مشاركين حالياً...";
        emptyMsg.style.textAlign = 'center';
        emptyMsg.style.color = '#aaa'; // Lighter text for empty message in dark theme
        participantListDiv.appendChild(emptyMsg);
    } else {
        participants.forEach(name => {
            const p = document.createElement('p');
            p.textContent = name;
            participantListDiv.appendChild(p);
        });
    }
    entriesCountSpan.textContent = participants.length; // Update count display
}

/**
 * Resizes the canvas based on the container size and device pixel ratio.
 */
function resizeCanvas() {
    const outerRect = wheelOuterContainer.getBoundingClientRect();
    const computedStyle = getComputedStyle(wheelOuterContainer);

    const paddingLeft = parseInt(computedStyle.paddingLeft, 10) || 0;
    const paddingRight = parseInt(computedStyle.paddingRight, 10) || 0;
    const paddingTop = parseInt(computedStyle.paddingTop, 10) || 0;
    const paddingBottom = parseInt(computedStyle.paddingBottom, 10) || 0;

    const availableWidth = outerRect.width - paddingLeft - paddingRight;
    const availableHeight = outerRect.height - paddingTop - paddingBottom;
    // Use Math.max to prevent size from becoming too small or negative
    const availableSize = Math.max(10, Math.min(availableWidth, availableHeight));

    // Respect CSS max-width from the container
    let cssMaxWidth = Infinity; // Default to infinity if not set
    // Check if maxWidth is set and not 'none'
    if (computedStyle.maxWidth && computedStyle.maxWidth !== 'none') {
         // Convert potential percentage/vw max-width to pixels relative to parent or viewport
         // This is complex; for simplicity, we'll parse pixel values directly
         // Or assume it's already handled by the browser layout if using relative units.
         // Let's rely on availableSize calculated from getBoundingClientRect for now.
         // cssMaxWidth = parseInt(computedStyle.maxWidth, 10) || availableSize; // Might be unreliable for non-px
    }
    canvasSize = Math.max(50, Math.min(availableSize)); // Ensure minimum 50px size

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize * dpr;
    canvas.height = canvasSize * dpr;

    canvas.style.width = `${canvasSize}px`;
    canvas.style.height = `${canvasSize}px`;

    WHEEL_CENTER_X = canvas.width / 2;
    WHEEL_CENTER_Y = canvas.height / 2;
    WHEEL_RADIUS = (canvas.width / 2) * 0.95; // Use slightly larger radius relative to canvas size

    drawWheel();
}


/**
 * Draws the wheel with participant segments and names.
 */
function drawWheel() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const numParticipants = participants.length;
    const dpr = window.devicePixelRatio || 1;
    const wheelBorderColor = getComputedStyle(document.documentElement).getPropertyValue('--wheel-border-color').trim() || '#ffffff';
    const wheelTextColor = getComputedStyle(document.documentElement).getPropertyValue('--wheel-text-color').trim() || '#000000';

    // --- Draw Empty Wheel State ---
    if (numParticipants === 0) {
        ctx.beginPath();
        ctx.arc(WHEEL_CENTER_X, WHEEL_CENTER_Y, WHEEL_RADIUS, 0, Math.PI * 2);
        ctx.strokeStyle = '#555'; // Darker border for empty wheel
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();
        ctx.font = `bold ${14 * dpr}px Arial`;
        ctx.fillStyle = '#888'; // Lighter text color
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("أضف أسماء للبدء", WHEEL_CENTER_X, WHEEL_CENTER_Y);
        return;
    }

    // --- Draw Wheel with One Participant ---
    if (numParticipants === 1) {
        const participant = participants[0];
        const color = participantColors[participant] || VIBRANT_COLORS[0];
        ctx.beginPath();
        ctx.arc(WHEEL_CENTER_X, WHEEL_CENTER_Y, WHEEL_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        // No border needed for single participant fill
        // ctx.strokeStyle = wheelBorderColor;
        // ctx.lineWidth = 2 * dpr;
        // ctx.stroke();

        const fontSize = Math.min(WHEEL_RADIUS / 3.5, 60 * dpr);
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillStyle = wheelTextColor; // Use black text
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textAngle = currentAngle + Math.PI;
        ctx.save();
        ctx.translate(WHEEL_CENTER_X, WHEEL_CENTER_Y);
        ctx.rotate(textAngle);
        ctx.fillText(participant, 0, 0); // Draw black text, no outline
        ctx.restore();
        return;
    }

    // --- Draw Wheel with Multiple Participants ---
    const anglePerSegment = (Math.PI * 2) / numParticipants;

    let fontSize;
    const baseFontSize = Math.min(45 * dpr, WHEEL_RADIUS / 7);
    if (numParticipants <= 6) { fontSize = baseFontSize * 1.0; }
    else if (numParticipants <= 12) { fontSize = baseFontSize * 0.9; }
    else if (numParticipants <= 20) { fontSize = baseFontSize * 0.75; }
    else { fontSize = Math.max(12 * dpr, baseFontSize * 0.6); }
    ctx.font = `bold ${fontSize}px Arial`;

    const textRadiusFactor = numParticipants > 10 ? 0.60 : 0.70; // Adjust text position
    const textRadius = WHEEL_RADIUS * textRadiusFactor;
    const maxTextWidth = anglePerSegment * textRadius * 0.9; // Max width allowed

    participants.forEach((participant, i) => {
        const startAngle = currentAngle + i * anglePerSegment;
        const endAngle = startAngle + anglePerSegment;
        const color = participantColors[participant] || VIBRANT_COLORS[i % VIBRANT_COLORS.length];

        // --- Draw Segment ---
        ctx.beginPath();
        ctx.moveTo(WHEEL_CENTER_X, WHEEL_CENTER_Y);
        ctx.arc(WHEEL_CENTER_X, WHEEL_CENTER_Y, WHEEL_RADIUS, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        // --- Draw Segment Border (White Line) ---
        ctx.strokeStyle = wheelBorderColor;
        ctx.lineWidth = 1 * dpr; // Thinner line maybe?
        ctx.beginPath();
        ctx.moveTo(WHEEL_CENTER_X, WHEEL_CENTER_Y); // Line from center
        ctx.lineTo(WHEEL_CENTER_X + WHEEL_RADIUS * Math.cos(startAngle),
                   WHEEL_CENTER_Y + WHEEL_RADIUS * Math.sin(startAngle));
        ctx.stroke(); // Stroke the starting radial line

        // --- Draw Text (Black, No Outline) ---
        const textAngle = startAngle + anglePerSegment / 2;
        ctx.save();
        ctx.translate(WHEEL_CENTER_X, WHEEL_CENTER_Y);
        ctx.rotate(textAngle);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = wheelTextColor; // BLACK text

        // --- Text Truncation Logic ---
        let displayText = participant;
        if (ctx.measureText(displayText).width > maxTextWidth) {
            let truncated = false;
            while (ctx.measureText(displayText + '…').width > maxTextWidth && displayText.length > 1) {
                displayText = displayText.slice(0, -1);
                truncated = true;
            }
            if (truncated) {
                displayText += '…';
            } else if (ctx.measureText(displayText).width > maxTextWidth) {
                 displayText = (displayText.length > 0) ? displayText[0] + '…' : '…';
             }
        }

        // Draw the text
        ctx.fillText(displayText, textRadius, 0);
        ctx.restore();
    });

     // Draw outer border after all segments if needed
     /*
     ctx.beginPath();
     ctx.arc(WHEEL_CENTER_X, WHEEL_CENTER_Y, WHEEL_RADIUS, 0, Math.PI * 2);
     ctx.strokeStyle = '#555'; // Example: dark border
     ctx.lineWidth = 1 * dpr;
     ctx.stroke();
     */
}

// --- Play Tick Sound Logic ---
function playTickIfNeeded(currentNormalizedAngle) {
    if (!audioUnlocked || participants.length <= 1) return;

    const segmentAngle = (Math.PI * 2) / participants.length;
    const currentSegmentIndex = Math.floor(currentNormalizedAngle / segmentAngle);
    const lastSegmentIndex = Math.floor(lastTickAngle / segmentAngle);

    if (currentSegmentIndex !== lastSegmentIndex) {
        try {
            if (tickSound.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
                tickSound.currentTime = 0;
                tickSound.play().catch(e => {
                    if (e.name !== 'AbortError') {
                        // console.warn("Tick sound play error:", e);
                    }
                });
            }
        } catch (error) {
            console.error("Error playing tick sound:", error);
        }
        lastTickAngle = currentNormalizedAngle;
    }
}

// --- Get Winner Function ---
function getWinner(finalAngle) {
    if (participants.length === 0) return null;
    if (participants.length === 1) return participants[0];

    const anglePerSegment = (Math.PI * 2) / participants.length;
    const normalizedAngle = (finalAngle % (Math.PI * 2) + (Math.PI * 2)) % (Math.PI * 2);
    const pointerEffectiveAngle = (Math.PI * 2 - normalizedAngle) % (Math.PI * 2);
    const winnerIndex = Math.floor(pointerEffectiveAngle / anglePerSegment);

    if (winnerIndex >= 0 && winnerIndex < participants.length) {
        return participants[winnerIndex];
    } else {
        console.error("Winner index calculation error.", { winnerIndex, numParticipants: participants.length, finalAngle, normalizedAngle, pointerEffectiveAngle });
        return participants[0];
    }
}

// --- Spin Animation ---
function spinAnimation() {
    if (!isSpinning) return;

    spinSpeed *= friction;
    currentAngle += spinSpeed;

    const normalizedCurrentAngle = (currentAngle % (Math.PI * 2) + (Math.PI * 2)) % (Math.PI * 2);
    playTickIfNeeded(normalizedCurrentAngle);

    if (spinSpeed < minSpinSpeed) {
        isSpinning = false;
        spinSpeed = 0;
        currentAngle = (currentAngle % (Math.PI * 2) + (Math.PI * 2)) % (Math.PI * 2);
        selectedWinner = getWinner(currentAngle);

        if (selectedWinner) {
            winnerNameEl.textContent = selectedWinner;
            winnerDisplay.classList.remove('hidden');
            try {
                if (audioUnlocked && winSound.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
                    winSound.currentTime = 0;
                    winSound.play().catch(e => { console.warn("Win sound play error:", e); });
                }
            } catch (error) { console.error("Error playing win sound:", error); }

            // --- Optional: Remove winner after a delay ---
            setTimeout(() => {
                if (!isSpinning && selectedWinner) {
                    const winnerIndex = participants.indexOf(selectedWinner);
                    if (winnerIndex > -1) {
                        participants.splice(winnerIndex, 1);
                        renderParticipantList();
                        updateParticipantInfo();
                        drawWheel();
                    }
                }
                if (!isSpinning) enableControls();
                selectedWinner = null;
            }, 2500);

        } else if (participants.length > 0) {
            console.error("Spin finished but couldn't determine winner.");
            winnerNameEl.textContent = "خطأ!";
            winnerDisplay.classList.remove('hidden');
            enableControls();
        } else {
            enableControls();
        }
        clearTimeout(spinTimeout);
    } else {
        requestAnimationFrame(spinAnimation);
    }
    drawWheel();
}


// --- Enable/Disable Controls ---
function enableControls() {
    spinButton.disabled = participants.length <= 1;
    addButton.disabled = false;
    clearButton.disabled = participants.length === 0;
    participantInput.disabled = false;
    // Avoid auto-focusing input on mobile as it can bring up keyboard undesirably
    if (window.innerWidth > 768) { // Example breakpoint for desktop
        participantInput.focus();
    }
}
function disableControls() {
    spinButton.disabled = true;
    addButton.disabled = true;
    clearButton.disabled = true;
    participantInput.disabled = true;
}

// --- Update Participant Info ---
function updateParticipantInfo() {
    const count = participants.length;
    let infoText = "";
    const canSpin = count > 1;

    if (count === 0) { infoText = "أضف مشاركين لتبدأ"; }
    else if (count === 1) { infoText = `مشارك واحد: ${participants[0]}. أضف المزيد للدوران.`; }
    else { infoText = `${count} مشاركين جاهزين`; }

    participantInfoEl.textContent = infoText;
    spinButton.disabled = !canSpin || isSpinning;
    clearButton.disabled = count === 0 || isSpinning;
    addButton.disabled = isSpinning;
    participantInput.disabled = isSpinning;
    entriesCountSpan.textContent = count;
}

// --- Event Handlers ---
function handleAddParticipant() {
    if (isSpinning) return;
    const name = participantInput.value.trim();
    if (name) {
        if (participants.some(p => p.toLowerCase() === name.toLowerCase())) {
            alert(`"${name}" موجود بالفعل!`);
            participantInput.select();
            return;
        }
        if (participants.length >= 100) {
            alert("لقد وصلت إلى الحد الأقصى لعدد المشاركين (100).");
            return;
        }
        participants.push(name);
        assignColorToParticipant(name);
        participantInput.value = '';
        renderParticipantList();
        updateParticipantInfo();
        drawWheel();
        winnerDisplay.classList.add('hidden');
        enableControls();
    }
    // Keep focus unless on small screens where keyboard might be intrusive
    if (window.innerWidth > 768) {
        participantInput.focus();
    }
}

function handleClearAll() {
    if (isSpinning) return;
    if (participants.length > 0 && confirm("هل أنت متأكد أنك تريد مسح جميع المشاركين؟")) {
        participants = [];
        participantColors = {};
        nextColorIndex = 0;
        selectedWinner = null;
        winnerDisplay.classList.add('hidden');
        isSpinning = false;
        spinSpeed = 0;
        currentAngle = 0;
        clearTimeout(spinTimeout);
        renderParticipantList();
        updateParticipantInfo();
        drawWheel();
        enableControls();
    }
}

function handleStartSpin() {
    if (isSpinning || participants.length <= 1) return;
    isSpinning = true;
    disableControls();
    winnerDisplay.classList.add('hidden');
    selectedWinner = null;
    lastTickAngle = (currentAngle % (Math.PI * 2) + (Math.PI * 2)) % (Math.PI * 2);
    const baseSpeed = 0.35 + Math.random() * 0.3;
    const randomBoost = Math.random() * 0.15;
    spinSpeed = baseSpeed + randomBoost;
    clearTimeout(spinTimeout);
    spinTimeout = setTimeout(() => {
        if (isSpinning) {
            console.warn("Spin animation safety timeout triggered. Resetting state.");
            isSpinning = false;
            spinSpeed = 0;
            currentAngle = (currentAngle % (Math.PI * 2) + (Math.PI * 2)) % (Math.PI * 2);
            selectedWinner = getWinner(currentAngle);
            if (selectedWinner) { winnerNameEl.textContent = selectedWinner + " (مهلة)"; }
            else { winnerNameEl.textContent = "خطأ (مهلة)"; }
            winnerDisplay.classList.remove('hidden');
            enableControls();
            drawWheel();
        }
    }, 25000);
    requestAnimationFrame(spinAnimation);
}

// --- Unlock Audio Context ---
function unlockAudio() {
    if (audioUnlocked) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
        console.warn("Web Audio API not supported.");
        audioUnlocked = true; return;
    }
    const context = new AudioContext();
    if (context.state === 'suspended') {
        context.resume().then(() => { playSilentSound(context); })
                     .catch(e => { console.error("Failed resume AC:", e); });
    } else { playSilentSound(context); }

    function playSilentSound(ctx) {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer; source.connect(ctx.destination);
        source.start(0);
        source.onended = () => {
            source.disconnect();
            try { tickSound.load(); winSound.load(); } catch (e) {}
            console.log("Audio context unlocked.");
            audioUnlocked = true;
            document.body.removeEventListener('click', unlockAudio, { capture: true });
            document.body.removeEventListener('touchstart', unlockAudio, { capture: true });
            document.body.removeEventListener('keydown', unlockAudio, { capture: true });
        }
    }
}

// --- Initialization ---
function init() {
    addButton.addEventListener('click', handleAddParticipant);
    clearButton.addEventListener('click', handleClearAll);
    spinButton.addEventListener('click', handleStartSpin);
    participantInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') { event.preventDefault(); handleAddParticipant(); }
    });
    window.addEventListener('resize', resizeCanvas);
    renderParticipantList();
    updateParticipantInfo();
    resizeCanvas(); // Call resizeCanvas AFTER setting up everything else
    document.body.addEventListener('click', unlockAudio, { once: true, capture: true });
    document.body.addEventListener('touchstart', unlockAudio, { once: true, capture: true });
    document.body.addEventListener('keydown', unlockAudio, { once: true, capture: true });
    console.log("Spinning Wheel Initialized (Dark Theme).");
}

// --- Run Initialization ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else { init(); }