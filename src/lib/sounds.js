const FEEL_PARAMS = {
    soft: { filterFreq: 2000, q: 1, oscType: "sine", decayMult: 1.5, gainMult: 0.7, pitchMult: 0.8 },
    aero: { filterFreq: 3500, q: 2, oscType: "sine", decayMult: 1.0, gainMult: 0.9, pitchMult: 1.0 },
    arcade: { filterFreq: 4000, q: 8, oscType: "square", decayMult: 0.5, gainMult: 1.0, pitchMult: 1.5 },
    organic: { filterFreq: 2500, q: 3, oscType: "triangle", decayMult: 1.3, gainMult: 0.85, pitchMult: 0.9 },
    glass: { filterFreq: 6000, q: 10, oscType: "sine", decayMult: 1.2, gainMult: 0.75, pitchMult: 1.8 },
    industrial: { filterFreq: 3000, q: 12, oscType: "sawtooth", decayMult: 0.6, gainMult: 1.2, pitchMult: 0.7 },
    minimal: { filterFreq: 2000, q: 1, oscType: "sine", decayMult: 0.8, gainMult: 0.4, pitchMult: 1.0 },
    retro: { filterFreq: 1500, q: 2, oscType: "square", decayMult: 1.1, gainMult: 0.8, pitchMult: 0.85 },
    crisp: { filterFreq: 5500, q: 4, oscType: "triangle", decayMult: 0.6, gainMult: 1.0, pitchMult: 1.1 },
};

let ctx = null;
let master = null;
let volume = 1;
let currentFeel = "aero";

function ensureCtx() {
    if (typeof window === "undefined") return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = volume;
        master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") {
        ctx.resume();
    }
    return ctx;
}

function play(fn) {
    const c = ensureCtx();
    if (!c) return;
    fn(c, c.currentTime, FEEL_PARAMS[currentFeel]);
}

function playClick(c, t, params) {
    const duration = 0.008 * params.decayMult;
    const buffer = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (50 * params.decayMult));
    }

    const noise = c.createBufferSource();
    noise.buffer = buffer;

    const filter = c.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = params.filterFreq;
    filter.Q.value = params.q;

    const gain = c.createGain();
    gain.gain.value = 0.5 * params.gainMult;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    noise.start(t);
}

function playPop(c, t, params) {
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = params.oscType;
    osc.frequency.setValueAtTime(400 * params.pitchMult, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.04 * params.decayMult);

    gain.gain.setValueAtTime(0.35 * params.gainMult, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05 * params.decayMult);

    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.05 * params.decayMult);
}

function playToggle(c, t, params) {
    const duration = 0.012 * params.decayMult;
    const buffer = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (80 * params.decayMult));
    }

    const noise = c.createBufferSource();
    noise.buffer = buffer;

    const filter = c.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2500;
    filter.Q.value = params.q;

    const noiseGain = c.createGain();
    noiseGain.gain.value = 0.4 * params.gainMult;

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start(t);

    const osc = c.createOscillator();
    const oscGain = c.createGain();

    osc.type = params.oscType;
    osc.frequency.setValueAtTime(800 * params.pitchMult, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.03 * params.decayMult);

    oscGain.gain.setValueAtTime(0.15 * params.gainMult, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04 * params.decayMult);

    osc.connect(oscGain);
    oscGain.connect(master);
    osc.start(t);
    osc.stop(t + 0.04 * params.decayMult);
}

function playTick(c, t, params) {
    const duration = 0.004 * params.decayMult;
    const buffer = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (20 * params.decayMult));
    }

    const noise = c.createBufferSource();
    noise.buffer = buffer;

    const filter = c.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 3000 * params.pitchMult;

    const gain = c.createGain();
    gain.gain.value = 0.3 * params.gainMult;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    noise.start(t);
}

function playDrop(c, t, params) {
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = params.oscType;
    osc.frequency.setValueAtTime(800 * params.pitchMult, t);
    osc.frequency.exponentialRampToValueAtTime(
        300 * params.pitchMult,
        t + 0.1 * params.decayMult,
    );

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.35 * params.gainMult, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12 * params.decayMult);

    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.12 * params.decayMult);
}

function playSuccess(c, t, params) {
    const notes = [523.25, 659.25, 783.99].map((n) => n * params.pitchMult);
    const spacing = 0.08 * params.decayMult;

    notes.forEach((freq, i) => {
        const osc = c.createOscillator();
        const gain = c.createGain();

        osc.type = params.oscType === "square" ? "triangle" : params.oscType;
        osc.frequency.value = freq;

        const start = t + i * spacing;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.25 * params.gainMult, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(
            0.001,
            start + 0.15 * params.decayMult,
        );

        osc.connect(gain);
        gain.connect(master);
        osc.start(start);
        osc.stop(start + 0.15 * params.decayMult);
    });
}

function playError(c, t, params) {
    const osc1 = c.createOscillator();
    const osc2 = c.createOscillator();
    const gain = c.createGain();

    const baseFreq = 180 * params.pitchMult;
    osc1.type = params.oscType === "sine" ? "sawtooth" : params.oscType;
    osc1.frequency.setValueAtTime(baseFreq, t);
    osc1.frequency.exponentialRampToValueAtTime(80, t + 0.25 * params.decayMult);

    osc2.type = params.oscType === "sine" ? "square" : params.oscType;
    osc2.frequency.setValueAtTime(baseFreq * 1.05, t);
    osc2.frequency.exponentialRampToValueAtTime(85, t + 0.25 * params.decayMult);

    gain.gain.setValueAtTime(0.2 * params.gainMult, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25 * params.decayMult);

    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 800;

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(filter);
    filter.connect(master);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.25 * params.decayMult);
    osc2.stop(t + 0.25 * params.decayMult);
}

function playWarning(c, t, params) {
    [0, 0.15 * params.decayMult].forEach((delay, i) => {
        const osc = c.createOscillator();
        const gain = c.createGain();

        osc.type = params.oscType === "square" ? "triangle" : params.oscType;
        osc.frequency.value = (i === 0 ? 880 : 698) * params.pitchMult;

        const start = t + delay;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.3 * params.gainMult, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(
            0.001,
            start + 0.12 * params.decayMult,
        );

        osc.connect(gain);
        gain.connect(master);
        osc.start(start);
        osc.stop(start + 0.12 * params.decayMult);
    });
}

function playStartup(c, t, params) {
    const chordNotes = [392, 493.88, 587.33, 784].map((n) => n * params.pitchMult);
    const delays = [0, 0.02, 0.04, 0.06].map((d) => d * params.decayMult);

    chordNotes.forEach((freq, i) => {
        const osc = c.createOscillator();
        const osc2 = c.createOscillator();
        const gain = c.createGain();
        const filter = c.createBiquadFilter();

        osc.type = params.oscType === "square" ? "triangle" : params.oscType;
        osc.frequency.value = freq;
        osc2.type = osc.type;
        osc2.frequency.value = freq * 1.002;

        filter.type = "lowpass";
        filter.frequency.value = 2000;

        const start = t + delays[i];
        const duration = 0.6 * params.decayMult - delays[i];

        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.14 * params.gainMult, start + 0.05);
        gain.gain.setValueAtTime(0.14 * params.gainMult, start + duration * 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(master);

        osc.start(start);
        osc2.start(start);
        osc.stop(start + duration);
        osc2.stop(start + duration);
    });
}

function playHover(c, t) {
    const start = t;
    const attack = 0.004;
    const decay = 0.035;
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 1500;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + attack + decay + 0.03);
}

const sounds = {
    click: () => play(playClick),
    pop: () => play(playPop),
    toggle: () => play(playToggle),
    tick: () => play(playTick),
    drop: () => play(playDrop),
    success: () => play(playSuccess),
    error: () => play(playError),
    warning: () => play(playWarning),
    startup: () => play(playStartup),
    hover: () => {
        const c = ensureCtx();
        if (!c) return;
        playHover(c, c.currentTime);
    },
    setFeel: (feel) => {
        currentFeel = feel;
    },
    setVolume: (v) => {
        volume = v;
        if (master) {
            master.gain.value = v;
        }
    },
};

export default sounds;
