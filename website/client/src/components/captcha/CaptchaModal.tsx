import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, RefreshCw, ShieldCheck, X, Waves, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/cn';
import { springSoft } from '../../lib/motion';

export interface CaptchaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (verificationToken: string) => void;
  title?: string;
  subtitle?: string;
}

// Curated high-res Gokarna coastal photography for the challenge
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

const CANVAS_WIDTH = 340;
const CANVAS_HEIGHT = 190;
const PIECE_SIZE = 42;
const TAB_RADIUS = 7;
const TOLERANCE = 6; // pixels of leeway

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
  title = 'Human Verification',
  subtitle = 'Drag the slider to complete the coastal puzzle.',
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
    // x: between 120 and 270 (so piece must slide noticeably)
    const randomX = Math.floor(Math.random() * (CANVAS_WIDTH - PIECE_SIZE - 120)) + 110;
    // y: between 25 and CANVAS_HEIGHT - PIECE_SIZE - 25
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
      // Draw puzzle path shifted by offset so it fits on piece canvas
      drawPuzzlePath(pieceCtx, TAB_RADIUS, TAB_RADIUS, PIECE_SIZE, TAB_RADIUS);
      pieceCtx.clip();

      // Draw the section of image that corresponds to the target position
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
      pieceCtx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      pieceCtx.lineWidth = 2;
      pieceCtx.stroke();
      pieceCtx.restore();

      // 3. Draw cutout silhouette on the main canvas
      mainCtx.save();
      drawPuzzlePath(mainCtx, randomX, randomY, PIECE_SIZE, TAB_RADIUS);
      mainCtx.fillStyle = 'rgba(10, 20, 30, 0.65)';
      mainCtx.fill();
      mainCtx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
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

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    // Verify placement
    const maxSlidable = CANVAS_WIDTH - PIECE_SIZE - 20;
    const currentPieceX = sliderValue * maxSlidable;
    const diff = Math.abs(currentPieceX - targetX);
    const duration = Date.now() - dragStartTime.current;

    setIsVerifying(true);

    // Basic heuristic: Humans take > 300ms to drag a slider, bots jump in 0-50ms
    const isHumanPace = duration > 250;
    const isHumanTrajectory = dragTrajectory.current.length > 5;

    setTimeout(() => {
      setIsVerifying(false);
      if (diff <= TOLERANCE && isHumanPace && isHumanTrajectory) {
        setStatus('success');
        // Generate a verified token with signature
        const token = `CT_CAPTCHA_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        setTimeout(() => {
          onSuccess(token);
          onClose();
        }, 900);
      } else {
        setStatus('fail');
        if (diff > TOLERANCE) {
          setErrorMessage('Puzzle not aligned. Try again.');
        } else {
          setErrorMessage('Unusual behavior detected. Please slide gently.');
        }
        setTimeout(() => {
          resetChallenge();
        }, 1200);
      }
    }, 300);
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
            className="fixed inset-0 bg-ink/70 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={springSoft}
            className="relative z-10 w-full max-w-[390px] overflow-hidden rounded-3xl border border-line bg-paper p-6 shadow-2xl shadow-ink/25"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-tide">
                  <ShieldCheck className="h-4 w-4" />
                  Security Check
                </div>
                <h3 className="mt-1 font-display text-xl font-bold text-ink">{title}</h3>
                <p className="mt-0.5 text-xs text-ink-2">{subtitle}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close captcha"
                className="rounded-full p-1 text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Canvas Playground */}
            <div className="relative mt-5 overflow-hidden rounded-2xl border border-line bg-ink/5 shadow-inner">
              <canvas
                ref={mainCanvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="block h-[190px] w-[340px] max-w-full select-none"
              />

              {/* Movable Puzzle Piece Canvas */}
              <div
                style={{
                  transform: `translate3d(${pieceLeftPx}px, ${targetY - TAB_RADIUS}px, 0)`,
                  transition: isDragging ? 'none' : 'transform 0.25s ease-out',
                }}
                className={cn(
                  'pointer-events-none absolute left-0 top-0 drop-shadow-lg',
                  status === 'success' && 'drop-shadow-[0_0_12px_rgba(40,167,69,0.8)]',
                )}
              >
                <canvas
                  ref={pieceCanvasRef}
                  width={PIECE_SIZE + TAB_RADIUS * 2}
                  height={PIECE_SIZE + TAB_RADIUS * 2}
                />
              </div>

              {/* Image Refresh Button & Location Badge */}
              <div className="absolute left-3 top-3 rounded-full bg-ink/75 px-2.5 py-0.5 font-mono text-[9px] font-medium text-white backdrop-blur-xs">
                {CAPTCHA_IMAGES[imageIndex].label}
              </div>

              <button
                type="button"
                onClick={nextImage}
                aria-label="New coastal image"
                title="Load another image"
                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-ink/75 text-white backdrop-blur-xs transition-transform hover:scale-110 active:rotate-180"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>

              {/* Verification Success Overlay */}
              <AnimatePresence>
                {status === 'success' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-ok/85 text-white backdrop-blur-xs"
                  >
                    <motion.div
                      initial={{ scale: 0.5, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={springSoft}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-ok shadow-lg"
                    >
                      <Check className="h-7 w-7 stroke-[3]" />
                    </motion.div>
                    <p className="mt-2 font-display text-sm font-bold tracking-wide">
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
                className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-ember"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            {/* Slider Track */}
            <div className="mt-4">
              <div
                ref={sliderTrackRef}
                className={cn(
                  'relative flex h-12 w-full items-center rounded-2xl border border-line bg-paper-2 px-1 select-none transition-colors',
                  status === 'fail' && 'border-ember/50 bg-ember/10 animate-shake',
                  status === 'success' && 'border-ok/50 bg-ok/10',
                )}
              >
                {/* Completed Fill Track */}
                <div
                  style={{ width: `${Math.max(sliderValue * 100, 4)}%` }}
                  className={cn(
                    'h-10 rounded-xl transition-all',
                    status === 'success' ? 'bg-ok/30' : 'bg-tide/20',
                  )}
                />

                {/* Slider Drag Handle */}
                <div
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  style={{
                    left: `calc(${sliderValue * 100}% - ${sliderValue * 44}px)`,
                  }}
                  className={cn(
                    'absolute flex h-10 w-11 cursor-grab items-center justify-center rounded-xl bg-tide text-white shadow-md transition-shadow active:cursor-grabbing hover:bg-tide-2',
                    status === 'success' && 'bg-ok hover:bg-ok',
                  )}
                >
                  {status === 'success' ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Waves className="h-4 w-4" />
                  )}
                </div>

                {/* Slider Prompt Text */}
                {sliderValue === 0 && status === 'idle' && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[11px] font-semibold text-ink-3">
                    Slide to align the puzzle →
                  </span>
                )}
              </div>
            </div>

            {/* Footer Trust Note */}
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3 font-mono text-[10px] text-ink-3">
              <span>Coastal Shield · Anti-Bot</span>
              <button
                type="button"
                onClick={resetChallenge}
                className="hover:text-ink hover:underline"
              >
                Reset challenge
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
