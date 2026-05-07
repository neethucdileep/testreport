import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  label: string;
  onComplete: () => void;
  disabled?: boolean;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export default function SwipeToStart({ label, onComplete, disabled }: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLButtonElement | null>(null);

  const [dragPx, setDragPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const maxPx = useMemo(() => {
    const el = trackRef.current;
    if (!el) return 0;
    // Track padding is 6px on both sides; knob is 48px.
    const trackWidth = el.getBoundingClientRect().width;
    return Math.max(0, trackWidth - 12 - 48);
  }, [trackRef.current]);

  const progress = maxPx > 0 ? clamp(dragPx / maxPx, 0, 1) : 0;

  useEffect(() => {
    function onResize() {
      setDragPx((prev) => clamp(prev, 0, maxPx || 0));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [maxPx]);

  function complete() {
    if (disabled) return;
    onComplete();
  }

  function reset() {
    setDragPx(0);
  }

  function updateFromClientX(clientX: number) {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const x = clientX - rect.left - 6; // left padding
    setDragPx(clamp(x - 24, 0, maxPx)); // center knob (48/2)
  }

  function onPointerDown(e: React.PointerEvent) {
    if (disabled) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateFromClientX(e.clientX);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDragging) return;
    updateFromClientX(e.clientX);
  }

  function onPointerUp() {
    setIsDragging(false);
    if (progress >= 0.92) {
      setDragPx(maxPx);
      complete();
      return;
    }
    reset();
  }

  return (
    <div
      className={`swipe ${disabled ? "is-disabled" : ""}`}
      ref={trackRef}
      aria-label={label}
      role="group"
    >
      <div className="swipe__fill" style={{ width: `${Math.round(progress * 100)}%` }} />

      <div className="swipe__label" aria-hidden="true">
        {label}
      </div>

      <button
        ref={knobRef}
        className="swipe__knob"
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            complete();
          }
        }}
        style={{ transform: `translateX(${dragPx}px)` }}
        aria-label={label}
        disabled={disabled}
      >
        <span className="swipe__arrow" aria-hidden="true">
          →
        </span>
      </button>
    </div>
  );
}

