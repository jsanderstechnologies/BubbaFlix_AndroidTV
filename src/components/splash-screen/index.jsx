import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./index.scss";

const SplashScreen = ({ onComplete }) => {
  const [fading, setFading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const audioCtxRef = useRef(null);
  const animationFrameRef = useRef(null);

  const logoWrapRef = useRef(null);
  const logoImgRef = useRef(null);
  const shineRef = useRef(null);
  const glowRef = useRef(null);
  const captionRef = useRef(null);

  const audioPlayedRef = useRef(false);

  // Synthesize cinematic reverb impulse
  const createReverbImpulse = (ctx, duration, decay) => {
    const rate = ctx.sampleRate;
    const length = rate * duration;
    const impulse = ctx.createBuffer(2, length, rate);
    for (let c = 0; c < 2; c++) {
      const channel = impulse.getChannelData(c);
      for (let i = 0; i < length; i++) {
        channel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  };

  // Synthesize cinematic low bass thump
  const playThump = (ctx, dest, reverbSend, startTime, freq, duration, volume) => {
    try {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq * 2.2, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq, startTime + 0.12);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.0001, startTime);
      oscGain.gain.linearRampToValueAtTime(volume, startTime + 0.015);
      oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(oscGain);
      oscGain.connect(dest);
      oscGain.connect(reverbSend);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);

      const bufferSize = Math.floor(ctx.sampleRate * 0.2);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.value = freq * 5;
      noiseFilter.Q.value = 0.7;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(volume * 0.5, startTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.09);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(dest);
      noiseGain.connect(reverbSend);
      noise.start(startTime);
    } catch {
      // Ignore audio synthesis errors on restricted devices
    }
  };

  const playIntroSound = () => {
    try {
      if (audioPlayedRef.current) return;
      audioPlayedRef.current = true;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const master = ctx.createGain();
      master.gain.value = 0.32;
      master.connect(ctx.destination);

      const reverbGain = ctx.createGain();
      reverbGain.gain.value = 0.40;
      const convolver = ctx.createConvolver();
      convolver.buffer = createReverbImpulse(ctx, 2.5, 2.2);
      reverbGain.connect(convolver);
      convolver.connect(master);

      const now = ctx.currentTime;

      // 1. "TA" - Initial punchy percussive knock (t = 0.67s)
      playThump(ctx, master, reverbGain, now + 0.67, 145, 0.35, 0.7);

      // 2. "DUM" - Main heavy sub-bass impact (t = 0.90s)
      playThump(ctx, master, reverbGain, now + 0.90, 54, 2.4, 1.0);

      // 3. Harmonic Cinematic Shimmer (t = 0.90s) - Warm overtone bloom tail
      const freqs = [146.83, 220.0, 293.66, 440.0, 587.33];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        osc.type = idx % 2 === 0 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(f, now + 0.90);

        const oscGain = ctx.createGain();
        const vol = 0.07 / (idx + 1);
        oscGain.gain.setValueAtTime(0.0001, now + 0.90);
        oscGain.gain.linearRampToValueAtTime(vol, now + 0.95);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.12);

        osc.connect(oscGain);
        oscGain.connect(master);
        oscGain.connect(reverbGain);

        osc.start(now + 0.90);
        osc.stop(now + 3.22);
      });
    } catch {
      // Browser autoplay restriction fallback
    }
  };

  const finishSplash = () => {
    setFading(true);
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 500);
  };

  const startAnimation = () => {
    if (hasStarted) return;
    setHasStarted(true);

    playIntroSound();

    const start = performance.now();
    const duration = 5000;

    const ease = (t, p) => 1 - Math.pow(1 - t, p);

    const frame = (now) => {
      const t = now - start;
      const logoWrap = logoWrapRef.current;
      const glow = glowRef.current;
      const shine = shineRef.current;
      const caption = captionRef.current;

      if (!logoWrap || !glow || !shine || !caption) {
        finishSplash();
        return;
      }

      if (t < 900) {
        const p = Math.min(t / 900, 1);
        const e = ease(p, 2.2);
        const scale = 0.25 + e * 0.58;
        const rot = -4 + e * 4;
        logoWrap.style.opacity = Math.min(p * 1.6, 1);
        logoWrap.style.transform = `scale(${scale}) rotate(${rot}deg)`;
        glow.style.opacity = e * 0.5;
        glow.style.transform = `scale(${0.6 + e * 0.5})`;
      } else if (t < 1300) {
        const p2 = (t - 900) / 400;
        const bounce = 0.83 + Math.sin(p2 * Math.PI) * 0.14;
        logoWrap.style.opacity = "1";
        logoWrap.style.transform = `scale(${bounce}) rotate(0deg)`;
        glow.style.opacity = `${0.5 + Math.sin(p2 * Math.PI) * 0.4}`;
        glow.style.transform = `scale(${1.1 + Math.sin(p2 * Math.PI) * 0.25})`;
      } else if (t < 2600) {
        const p3 = (t - 1300) / 1300;
        logoWrap.style.opacity = "1";
        logoWrap.style.transform = "scale(1) rotate(0deg)";
        glow.style.opacity = `${Math.max(0.5 - p3 * 0.35, 0.15)}`;
        glow.style.transform = "scale(1.05)";
        shine.style.backgroundPosition = `${150 - p3 * 300}% 0`;
        caption.style.opacity = `${Math.min(p3 * 2, 1)}`;
      } else {
        logoWrap.style.opacity = "1";
        glow.style.opacity = "0.15";
        caption.style.opacity = "1";
      }

      if (t < duration) {
        animationFrameRef.current = requestAnimationFrame(frame);
      } else {
        finishSplash();
      }
    };

    animationFrameRef.current = requestAnimationFrame(frame);
  };

  useEffect(() => {
    // Set up mask image when logo loads
    const updateMask = () => {
      if (logoImgRef.current && shineRef.current) {
        shineRef.current.style.setProperty("--mask-url", `url(${logoImgRef.current.src})`);
      }
    };

    if (logoImgRef.current?.complete) {
      updateMask();
    }

    // Auto-start animation on mount
    const timer = setTimeout(() => {
      startAnimation();
    }, 100);

    // Hard fallback safety timer to guarantee splash screen disappears
    const safetyTimer = setTimeout(() => {
      finishSplash();
    }, 5000);

    // Keyboard / remote dpad handler to skip or trigger audio
    const handleKeyDown = (e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Escape" || e.key.startsWith("Arrow")) {
        playIntroSound();
        finishSplash();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      clearTimeout(safetyTimer);
      window.removeEventListener("keydown", handleKeyDown);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`bubbaflixSplashStage ${fading ? "fadingOut" : ""}`}
      onClick={() => {
        playIntroSound();
        finishSplash();
      }}
      tabIndex="0"
    >
      <svg id="splashGrain" width="100%" height="100%">
        <filter id="n">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#n)" />
      </svg>
      <div id="splashGlow" ref={glowRef}></div>
      <div id="splashLogoWrap" ref={logoWrapRef}>
        <img
          id="splashLogoImg"
          ref={logoImgRef}
          src="/tv_banner.png"
          alt="BubbaFlix"
          onLoad={() => {
            if (shineRef.current && logoImgRef.current) {
              shineRef.current.style.setProperty("--mask-url", `url(${logoImgRef.current.src})`);
            }
          }}
        />
        <div id="splashShine" ref={shineRef}></div>
      </div>
      <div id="splashCaption" ref={captionRef}>
        BubbaFlix Streaming
      </div>
    </div>,
    document.body
  );
};

export default SplashScreen;
