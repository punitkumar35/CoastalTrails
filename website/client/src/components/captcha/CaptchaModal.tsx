import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, RefreshCw, X, AlertTriangle, Info, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import { springSoft } from '../../lib/motion';
import { ReCaptchaLogo } from './ReCaptchaWidget';

export interface CaptchaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (verificationToken: string) => void;
  title?: string;
  subtitle?: string;
}

// Curated high-res Gokarna coastal photography for the challenge
const CAPTCHA_IMAGES = [
  {
    url: '/images/hero-raman.jpg',
    label: 'Kudle Cliff Sanctuary',
  },
  {
    url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=640&q=80',
    label: 'Om Beach Horizon',
  },
  {
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=640&q=80',
    label: 'Half Moon Shoreline',
  },
  {
    url: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=640&q=80',
    label: 'Main Beach Sunset',
  },
];

const CANVAS_WIDTH = 336;
const CANVAS_HEIGHT = 188;
const PIECE_SIZE = 42;
const TAB_RADIUS = 7;
const TOLERANCE = 7; // pixels of leeway

// Helper to draw an interlocking jigsaw puzzle path
function drawPuzzlePath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x, y);

  // Top edge (tab pointing up)
  ctx.lineTo(x + size / 2 - r, y);
  ctx.arc(x + size / 2, y - r, r, (3 * Math.PI) / 4, (9 * Math.PI) / 4);
  ctx.lineTo(x + size, y);

  // Right edge (tab pointing right)
  ctx.lineTo(x + size, y + size / 2 - r);
  ctx.arc(x + size + r, y + size / 2, r, Math.PI / 4, (7 * Math.PI) / 4);
  ctx.lineTo(x + size, y + size);

  // Bottom edge (slot pointing up)
  ctx.lineTo(x + size / 2 + r, y + size);
  ctx.arc(x + size / 2, y + size - r, r, (7 * Math.PI) / 4, (1 * Math.PI) / 4, true);
  ctx.lineTo(x, y + size);

  // Left edge
  ctx.lineTo(x, y);
  ctx.closePath();
}

export const CaptchaModal: React.FC<CaptchaModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Verify you are human',
  subtitle = 'Drag the slider to fit the puzzle piece into the coastal image.',
}) => {
  const [imageIndex, setImageIndex] = useState(0);
  const [targetX, setTargetX] = useState(150);
  const [targetY, setTargetY] = useState(60);
  const [sliderValue, setSliderValue] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'fail'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pieceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStartTime = useRef<number>(0);
  const dragTrajectory = useRef<{ x: number; time: number }[]>([]);
  const sliderTrackRef = useRef<HTMLDivElement | null>(null);

  // Initialize or reset challenge
  const resetChallenge = useCallback(() => {
    setStatus('idle');
    setSliderValue(0);
    setErrorMessage('');
    setIsDragging(false);

    // Pick random target position
    const randomX = Math.floor(Math.random() * (CANVAS_WIDTH - PIECE_SIZE - 120)) + 110;
    const randomY = Math.floor(Math.random() * (CANVAS_HEIGHT - PIECE_SIZE - 50)) + 25;

    setTargetX(randomX);
    setTargetY(randomY);

    const renderScene = (imageSource: CanvasImageSource) => {
      const mainCanvas = mainCanvasRef.current;
      const pieceCanvas = pieceCanvasRef.current;
      if (!mainCanvas || !pieceCanvas) return;

      const mainCtx = mainCanvas.getContext('2d');
      const pieceCtx = pieceCanvas.getContext('2d');
      if (!mainCtx || !pieceCtx) return;

      // 1. Draw base image onto main canvas
      mainCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      mainCtx.drawImage(imageSource, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 2. Cut out the puzzle piece onto the piece canvas
      pieceCanvas.width = PIECE_SIZE + TAB_RADIUS * 2;
      pieceCanvas.height = PIECE_SIZE + TAB_RADIUS * 2;
      pieceCtx.clearRect(0, 0, pieceCanvas.width, pieceCanvas.height);

      pieceCtx.save();
      drawPuzzlePath(pieceCtx, TAB_RADIUS, TAB_RADIUS, PIECE_SIZE, TAB_RADIUS);
      pieceCtx.clip();

      pieceCtx.drawImage(
        imageSource,
        randomX - TAB_RADIUS,
        randomY - TAB_RADIUS,
        pieceCanvas.width,
        pieceCanvas.height,
        0,
        0,
        pieceCanvas.width,
        pieceCanvas.height,
      );

      // Add embossed inner border on the puzzle piece
      pieceCtx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      pieceCtx.lineWidth = 2;
      pieceCtx.stroke();
      pieceCtx.restore();

      // 3. Draw cutout silhouette on the main canvas
      mainCtx.save();
      drawPuzzlePath(mainCtx, randomX, randomY, PIECE_SIZE, TAB_RADIUS);
      mainCtx.fillStyle = 'rgba(15, 23, 42, 0.65)';
      mainCtx.fill();
      mainCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      mainCtx.lineWidth = 2;
      mainCtx.setLineDash([4, 3]);
      mainCtx.stroke();
      mainCtx.restore();
    };

    const drawFallbackGradient = () => {
      const offscreen = document.createElement('canvas');
      offscreen.width = CANVAS_WIDTH;
      offscreen.height = CANVAS_HEIGHT;
      const oCtx = offscreen.getContext('2d');
      if (!oCtx) return;
      const grad = oCtx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      grad.addColorStop(0, '#0f2942');
      grad.addColorStop(0.35, '#193b54');
      grad.addColorStop(0.7, '#236e78');
      grad.addColorStop(1, '#dfad39');
      oCtx.fillStyle = grad;
      oCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      renderScene(offscreen);
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = CAPTCHA_IMAGES[imageIndex].url;
    img.onload = () => renderScene(img);
    img.onerror = () => drawFallbackGradient();
  }, [imageIndex]);

  useEffect(() => {
    if (isOpen) {
      resetChallenge();
    }
  }, [isOpen, resetChallenge]);

  // Handle Drag / Touch
  const handlePointerDown = (e: React.PointerEvent) => {
    if (status === 'success' || isVerifying) return;
    setIsDragging(true);
    setStatus('idle');
    setErrorMessage('');
    dragStartTime.current = Date.now();
    dragTrajectory.current = [{ x: e.clientX, time: Date.now() }];
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !sliderTrackRef.current) return;
    const track = sliderTrackRef.current.getBoundingClientRect();
    const maxTrackWidth = track.width - 44; // 44px handle
    const currentX = Math.max(0, Math.min(e.clientX - track.left - 22, maxTrackWidth));
    const percent = currentX / maxTrackWidth;
    setSliderValue(percent);

    dragTrajectory.current.push({ x: e.clientX, time: Date.now() });
  };

  const evaluateVerification = (currentVal: number) => {
    const maxSlidable = CANVAS_WIDTH - PIECE_SIZE - 20;
    const currentPieceX = currentVal * maxSlidable;
    const diff = Math.abs(currentPieceX - targetX);
    const duration = Date.now() - (dragStartTime.current || Date.now() - 400);

    setIsVerifying(true);

    const isHumanPace = duration > 180;
    const isHumanTrajectory = dragTrajectory.current.length > 3 || currentVal > 0.1;

    setTimeout(() => {
      setIsVerifying(false);
      if (diff <= TOLERANCE && isHumanPace && isHumanTrajectory) {
        setStatus('success');
        const token = `CT_CAPTCHA_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        try {
          sessionStorage.setItem('ct_captcha_token', token);
        } catch {}
        setTimeout(() => {
          onSuccess(token);
          onClose();
        }, 800);
      } else {
        setStatus('fail');
        if (diff > TOLERANCE) {
          setErrorMessage('Please try again.');
        } else {
          setErrorMessage('Verification failed. Slide gently.');
        }
        setTimeout(() => {
          resetChallenge();
        }, 1100);
      }
    }, 280);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    evaluateVerification(sliderValue);
  };

  const nextImage = () => {
    setImageIndex((prev) => (prev + 1) % CAPTCHA_IMAGES.length);
  };

  const maxSlidable = CANVAS_WIDTH - PIECE_SIZE - 20;
  const pieceLeftPx = sliderValue * maxSlidable;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Google reCAPTCHA v2 / Enterprise Style Challenge Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={springSoft}
            className="relative z-10 w-full max-w-[368px] overflow-hidden rounded-xl border border-[#c1c1c1] bg-white shadow-2xl dark:border-white/15 dark:bg-[#202124]"
          >
            {/* Signature Google Blue Header */}
            <div className="relative bg-[#1a73e8] px-5 py-3.5 text-white dark:bg-[#1967d2]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-medium tracking-wide text-white/90">
                    Security challenge
                  </p>
                  <h3 className="mt-0.5 font-sans text-lg font-bold leading-tight tracking-tight text-white">
                    {title}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-white/85">
                    {subtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="rounded-full p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Challenge Body */}
            <div className="p-4">
              {/* Canvas Playground */}
              <div className="relative overflow-hidden rounded-lg border border-[#dadce0] bg-[#f8f9fa] shadow-inner dark:border-white/10 dark:bg-black/30">
                <canvas
                  ref={mainCanvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  className="block h-[188px] w-[336px] max-w-full select-none"
                />

                {/* Movable Puzzle Piece Canvas */}
                <div
                  style={{
                    transform: `translate3d(${pieceLeftPx}px, ${targetY - TAB_RADIUS}px, 0)`,
                    transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                  }}
                  className={cn(
                    'pointer-events-none absolute left-0 top-0 drop-shadow-md',
                    status === 'success' && 'drop-shadow-[0_0_12px_rgba(15,157,88,0.8)]',
                  )}
                >
                  <canvas
                    ref={pieceCanvasRef}
                    width={PIECE_SIZE + TAB_RADIUS * 2}
                    height={PIECE_SIZE + TAB_RADIUS * 2}
                  />
                </div>

                {/* Coastal Location Badge */}
                <div className="absolute left-2.5 top-2.5 rounded-sm bg-black/75 px-2 py-0.5 font-sans text-[10px] font-medium text-white backdrop-blur-xs">
                  {CAPTCHA_IMAGES[imageIndex].label}
                </div>

                {/* Success Overlay */}
                <AnimatePresence>
                  {status === 'success' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f9d58]/90 text-white backdrop-blur-xs"
                    >
                      <motion.div
                        initial={{ scale: 0.5, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={springSoft}
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#0f9d58] shadow-lg"
                      >
                        <Check className="h-7 w-7 stroke-[3.2]" />
                      </motion.div>
                      <p className="mt-2 text-sm font-bold tracking-tight">
                        Verification Complete
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2.5 flex items-center gap-1.5 rounded-md bg-[#d93025]/10 px-2.5 py-1.5 text-[11px] font-medium text-[#d93025]"
                >
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}

              {/* Slider Track */}
              <div className="mt-3.5">
                <div
                  ref={sliderTrackRef}
                  className={cn(
                    'relative flex h-11 w-full items-center rounded-lg border border-[#dadce0] bg-[#f1f3f4] px-1 select-none transition-colors dark:border-white/15 dark:bg-[#303134]',
                    status === 'fail' && 'border-[#d93025] bg-[#d93025]/10',
                    status === 'success' && 'border-[#0f9d58] bg-[#0f9d58]/10',
                  )}
                >
                  {/* Filled Progress Track */}
                  <div
                    style={{ width: `${Math.max(sliderValue * 100, 3)}%` }}
                    className={cn(
                      'h-9 rounded-md transition-all',
                      status === 'success' ? 'bg-[#0f9d58]/30' : 'bg-[#1a73e8]/25',
                    )}
                  />

                  {/* Drag Handle */}
                  <div
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    style={{
                      left: `calc(${sliderValue * 100}% - ${sliderValue * 44}px)`,
                    }}
                    className={cn(
                      'absolute flex h-9 w-11 cursor-grab items-center justify-center rounded-md bg-[#1a73e8] text-white shadow-xs transition-shadow active:cursor-grabbing hover:bg-[#1557b0]',
                      status === 'success' && 'bg-[#0f9d58] hover:bg-[#0f9d58]',
                    )}
                  >
                    {status === 'success' ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                    )}
                  </div>

                  {/* Hint Text */}
                  {sliderValue === 0 && status === 'idle' && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-medium text-[#70757a] dark:text-white/60">
                      Slide puzzle piece to right →
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Google reCAPTCHA Footer Toolbar */}
            <div className="flex items-center justify-between border-t border-[#dadce0] bg-[#f8f9fa] px-4 py-2.5 dark:border-white/10 dark:bg-[#1f2023]">
              {/* Left Action Tools */}
              <div className="flex items-center gap-3 text-[#5f6368] dark:text-white/70">
                <button
                  type="button"
                  onClick={nextImage}
                  title="Reload new image"
                  aria-label="Reload challenge"
                  className="rounded-full p-1.5 transition-colors hover:bg-black/5 hover:text-[#202124] dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={resetChallenge}
                  title="Instructions"
                  aria-label="Challenge instructions"
                  className="rounded-full p-1.5 transition-colors hover:bg-black/5 hover:text-[#202124] dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <Info className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1.5 pl-1">
                  <ReCaptchaLogo className="h-5 w-5" />
                  <span className="text-[10px] font-semibold text-[#555] dark:text-white/70">reCAPTCHA</span>
                </div>
              </div>

              {/* Verify Primary Action Button */}
              <button
                type="button"
                onClick={() => evaluateVerification(sliderValue)}
                disabled={isVerifying || status === 'success'}
                className={cn(
                  'rounded-md bg-[#1a73e8] px-5 py-2 text-xs font-bold tracking-wider text-white shadow-xs transition-all hover:bg-[#1557b0] active:scale-95 disabled:opacity-50 dark:bg-[#1a73e8]',
                  status === 'success' && 'bg-[#0f9d58] hover:bg-[#0f9d58]',
                )}
              >
                {status === 'success' ? 'VERIFIED' : isVerifying ? 'VERIFYING…' : 'VERIFY'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
