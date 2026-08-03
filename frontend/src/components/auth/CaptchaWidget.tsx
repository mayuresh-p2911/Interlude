'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowPathIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { authApi } from '@/lib/api';

interface CaptchaWidgetProps {
  onCaptchaChange: (data: { captchaToken: string; captchaInput: string }) => void;
  refreshTrigger?: number;
  error?: string;
}

export default function CaptchaWidget({ onCaptchaChange, refreshTrigger, error }: CaptchaWidgetProps) {
  const [captchaToken, setCaptchaToken] = useState<string>('');
  const [captchaText, setCaptchaText] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Keep a stable ref to onCaptchaChange to prevent re-render loops
  const onCaptchaChangeRef = useRef(onCaptchaChange);
  useEffect(() => {
    onCaptchaChangeRef.current = onCaptchaChange;
  }, [onCaptchaChange]);

  const fetchNewCaptcha = useCallback(async () => {
    setLoading(true);
    setUserInput('');
    onCaptchaChangeRef.current({ captchaToken: '', captchaInput: '' });

    try {
      const res = await authApi.getCaptcha();
      const { captchaToken: token, captchaText: text } = res.data as {
        captchaToken: string;
        captchaText: string;
      };
      setCaptchaToken(token);
      setCaptchaText(text);
      onCaptchaChangeRef.current({ captchaToken: token, captchaInput: '' });
    } catch (err) {
      console.warn('Failed to fetch CAPTCHA from API, using client fallback:', err);
      const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      const lowercase = 'abcdefghijkmnpqrstuvwxyz';
      const numbers = '23456789';
      const all = uppercase + lowercase + numbers;

      let text = '';
      text += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
      text += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
      text += numbers.charAt(Math.floor(Math.random() * numbers.length));
      for (let i = 0; i < 2; i++) {
        text += all.charAt(Math.floor(Math.random() * all.length));
      }
      text = text.split('').sort(() => Math.random() - 0.5).join('');

      const fallbackToken = `fallback_${Date.now()}_${text}`;
      setCaptchaToken(fallbackToken);
      setCaptchaText(text);
      onCaptchaChangeRef.current({ captchaToken: fallbackToken, captchaInput: '' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNewCaptcha();
  }, [fetchNewCaptcha, refreshTrigger]);

  // Handle case-sensitive user input (supports both uppercase, lowercase, and numbers)
  const handleInputChange = (val: string) => {
    setUserInput(val);
    onCaptchaChangeRef.current({ captchaToken, captchaInput: val });
  };

  // Render dancing distorted mixed-case letters & numbers on canvas
  useEffect(() => {
    if (!captchaText || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Character dance configuration
    const charConfigs = captchaText.split('').map((char, index) => {
      const isUpper = char >= 'A' && char <= 'Z';
      const isNumber = char >= '0' && char <= '9';
      return {
        char,
        isUpper,
        isNumber,
        baseX: 22 + index * 36,
        baseY: height / 2 + 4,
        baseAngle: (Math.sin(index * 2.2) * 16 * Math.PI) / 180,
        fontSize: isUpper ? 26 : isNumber ? 24 : 22,
        color: [
          '#60A5FA', // Blue ice
          '#3B82F6', // Electric blue
          '#93C5FD', // Light sky
          '#38BDF8', // Cyan electric
          '#818CF8', // Indigo light
        ][index % 5],
        speed: 0.003 + (index % 2) * 0.002,
        phase: index * 1.2,
      };
    });

    let startTime = performance.now();

    const draw = (time: number) => {
      const elapsed = time - startTime;
      ctx.clearRect(0, 0, width, height);

      // 1. Dark glowing gradient background
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#0B172A');
      bgGrad.addColorStop(1, '#050C1A');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Border line
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(1, 1, width - 2, height - 2);

      // 2. Distorted wavy noise lines in background
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(96, 165, 250, ${0.18 + i * 0.08})`;
        ctx.lineWidth = 1.5 + i * 0.5;
        for (let x = 0; x < width; x += 5) {
          const y =
            height / 2 +
            Math.sin(x * 0.03 + elapsed * 0.002 + i) * 8 +
            Math.cos(x * 0.02 + elapsed * 0.001) * 4;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // 3. Noise dots
      for (let i = 0; i < 25; i++) {
        const nx = (Math.sin(i * 99 + elapsed * 0.001) * 0.5 + 0.5) * width;
        const ny = (Math.cos(i * 33 + elapsed * 0.001) * 0.5 + 0.5) * height;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(59,130,246,0.35)';
        ctx.fillRect(nx, ny, 2, 2);
      }

      // 4. Render Dancing & Distorted Characters (Clear case distinction)
      charConfigs.forEach((cfg) => {
        ctx.save();

        // Dynamic dancing offsets (sine + cosine wave animation)
        const floatY = Math.sin(elapsed * cfg.speed * 2 + cfg.phase) * 4;
        const danceAngle = cfg.baseAngle + Math.cos(elapsed * cfg.speed + cfg.phase) * 0.12;

        ctx.translate(cfg.baseX, cfg.baseY + floatY);
        ctx.rotate(danceAngle);

        ctx.font = `bold ${cfg.fontSize}px 'Outfit', 'Inter', monospace, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Text glow & shadow
        ctx.shadowColor = cfg.color;
        ctx.shadowBlur = 6;
        ctx.fillStyle = cfg.color;
        ctx.fillText(cfg.char, 0, 0);

        // White outline stroke for distinct character clarity
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 0.7;
        ctx.strokeText(cfg.char, 0, 0);

        ctx.restore();
      });

      // 5. Strike-through distortion line over text
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.moveTo(10, height / 2 + Math.sin(elapsed * 0.003) * 6);
      ctx.bezierCurveTo(
        width * 0.3,
        height / 2 - 10,
        width * 0.7,
        height / 2 + 10,
        width - 10,
        height / 2 + Math.cos(elapsed * 0.003) * 6,
      );
      ctx.stroke();

      animFrameIdRef.current = requestAnimationFrame(draw);
    };

    animFrameIdRef.current = requestAnimationFrame(draw);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [captchaText]);

  return (
    <div className="space-y-3 my-4 p-4 rounded-2xl bg-surface-2/60 border border-white/10 shadow-lg">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-white flex items-center gap-1.5">
          <ShieldCheckIcon className="w-4 h-4 text-blue-electric" />
          Human Verification (CAPTCHA)
        </label>
        <span className="text-xs text-blue-ice/80 font-medium">Case-sensitive</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative rounded-xl overflow-hidden shadow-inner border border-blue-electric/30 shrink-0 bg-surface-3">
          <canvas
            ref={canvasRef}
            width={210}
            height={54}
            className="block cursor-pointer select-none"
            onClick={fetchNewCaptcha}
            title="Click to refresh CAPTCHA challenge"
          />
          {loading && (
            <div className="absolute inset-0 bg-surface-1/80 backdrop-blur-sm flex items-center justify-center">
              <ArrowPathIcon className="w-5 h-5 text-blue-electric animate-spin" />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={fetchNewCaptcha}
          disabled={loading}
          className="p-3.5 rounded-xl bg-surface-3 border border-white/10 hover:bg-surface-1 hover:border-blue-electric/40 text-text-secondary hover:text-white transition-all active:scale-95 shrink-0"
          title="Get a new CAPTCHA challenge"
        >
          <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin text-blue-electric' : ''}`} />
        </button>
      </div>

      <div>
        <input
          type="text"
          value={userInput}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Enter characters exactly as shown (e.g. k7B9x)"
          maxLength={6}
          className={`input-field font-mono font-bold text-center text-base tracking-wider ${
            error ? 'border-red-500/80 focus:border-red-500 ring-2 ring-red-500/20' : ''
          }`}
          required
          autoComplete="off"
        />
        {error ? (
          <p className="mt-1.5 text-xs text-red-400 font-medium flex items-center gap-1">
            ⚠️ {error}
          </p>
        ) : (
          <p className="mt-1 text-xs text-text-muted">
            Enter uppercase letters, lowercase letters, and numbers matching the image.
          </p>
        )}
      </div>
    </div>
  );
}
