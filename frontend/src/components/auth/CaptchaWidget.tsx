'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowPathIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { authApi } from '@/lib/api';

interface CaptchaWidgetProps {
  onCaptchaChange: (data: { captchaToken: string; captchaInput: string }) => void;
  error?: string;
}

export default function CaptchaWidget({ onCaptchaChange, error }: CaptchaWidgetProps) {
  const [captchaToken, setCaptchaToken] = useState<string>('');
  const [captchaText, setCaptchaText] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const fetchNewCaptcha = useCallback(async () => {
    setLoading(true);
    setUserInput('');
    onCaptchaChange({ captchaToken: '', captchaInput: '' });
    try {
      const res = await authApi.getCaptcha();
      const { captchaToken: token, captchaText: text } = res.data as {
        captchaToken: string;
        captchaText: string;
      };
      setCaptchaToken(token);
      setCaptchaText(text);
    } catch (err) {
      console.error('Failed to fetch CAPTCHA challenge:', err);
    } finally {
      setLoading(false);
    }
  }, [onCaptchaChange]);

  useEffect(() => {
    fetchNewCaptcha();
  }, []);

  // Update parent when user types input
  const handleInputChange = (val: string) => {
    const uppercaseVal = val.toUpperCase();
    setUserInput(uppercaseVal);
    onCaptchaChange({ captchaToken, captchaInput: uppercaseVal });
  };

  // Render dancing distorted letters on canvas
  useEffect(() => {
    if (!captchaText || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Fixed base parameters for characters to stay visually consistent while dancing
    const charConfigs = captchaText.split('').map((char, index) => {
      return {
        char,
        baseX: 25 + index * 38,
        baseY: height / 2 + 6,
        baseAngle: (Math.sin(index * 2) * 20 * Math.PI) / 180,
        fontSize: 26 + (index % 3) * 4,
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

      // 1. Dark glowing background
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#091326');
      bgGrad.addColorStop(1, '#050B17');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Border gradient line
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(1, 1, width - 2, height - 2);

      // 2. Distorted wavy noise lines in background
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(96, 165, 250, ${0.15 + i * 0.08})`;
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
      for (let i = 0; i < 30; i++) {
        const nx = (Math.sin(i * 99 + elapsed * 0.001) * 0.5 + 0.5) * width;
        const ny = (Math.cos(i * 33 + elapsed * 0.001) * 0.5 + 0.5) * height;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(59,130,246,0.3)';
        ctx.fillRect(nx, ny, 2, 2);
      }

      // 4. Render Dancing & Distorted Characters
      charConfigs.forEach((cfg) => {
        ctx.save();

        // Calculate dynamic dancing offsets (sine + cosine wave animation)
        const floatY = Math.sin(elapsed * cfg.speed * 2 + cfg.phase) * 5;
        const danceAngle = cfg.baseAngle + Math.cos(elapsed * cfg.speed + cfg.phase) * 0.12;

        ctx.translate(cfg.baseX, cfg.baseY + floatY);
        ctx.rotate(danceAngle);

        ctx.font = `900 ${cfg.fontSize}px 'Outfit', 'Inter', system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Glow effect
        ctx.shadowColor = cfg.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = cfg.color;
        ctx.fillText(cfg.char, 0, 0);

        // Stroke outline for distortion feel
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 0.8;
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
        height / 2 - 12,
        width * 0.7,
        height / 2 + 12,
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
    <div className="space-y-3">
      <label className="block text-sm font-medium text-text-secondary flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <ShieldCheckIcon className="w-4 h-4 text-blue-electric" />
          Human Verification
        </span>
        <span className="text-xs text-text-muted">Distorted character check</span>
      </label>

      <div className="flex items-center gap-3">
        <div className="relative rounded-xl overflow-hidden shadow-inner border border-white/10 shrink-0 bg-surface-2">
          <canvas
            ref={canvasRef}
            width={220}
            height={56}
            className="block cursor-pointer select-none"
            onClick={fetchNewCaptcha}
            title="Click to refresh CAPTCHA"
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
          className="p-3.5 rounded-xl bg-surface-2 border border-white/10 hover:bg-surface-3 hover:border-blue-electric/40 text-text-secondary hover:text-white transition-all active:scale-95 shrink-0"
          title="Get a new challenge"
        >
          <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin text-blue-electric' : ''}`} />
        </button>
      </div>

      <div>
        <input
          type="text"
          value={userInput}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Enter the dancing characters"
          maxLength={6}
          className={`input-field tracking-widest uppercase font-mono font-bold ${
            error ? 'border-red-500/80 focus:border-red-500' : ''
          }`}
          required
          autoComplete="off"
        />
        {error && <p className="mt-1 text-xs text-red-400 font-medium">{error}</p>}
      </div>
    </div>
  );
}
