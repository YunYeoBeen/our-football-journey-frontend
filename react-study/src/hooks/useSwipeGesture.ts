import { useRef, useCallback } from 'react';

interface SwipeGestureOptions {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  onDragProgress?: (progress: number) => void;
}

export function useSwipeGesture(options: SwipeGestureOptions) {
  const {
    onSwipeUp,
    onSwipeDown,
    onSwipeLeft,
    onSwipeRight,
    threshold = 40,
    onDragProgress,
  } = options;

  const startY = useRef(0);
  const startX = useRef(0);
  const isDragging = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;

    const deltaY = e.touches[0].clientY - startY.current;
    const deltaX = e.touches[0].clientX - startX.current;

    // Determine if vertical or horizontal swipe
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      // Vertical: progress -1 (up) to 1 (down)
      const progress = Math.max(-1, Math.min(1, deltaY / 150));
      onDragProgress?.(progress);
    }
  }, [onDragProgress]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const endY = e.changedTouches[0].clientY;
    const endX = e.changedTouches[0].clientX;
    const deltaY = endY - startY.current;
    const deltaX = endX - startX.current;

    onDragProgress?.(0);

    // Determine primary direction
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      // Vertical swipe
      if (deltaY < -threshold) {
        onSwipeUp?.();
      } else if (deltaY > threshold) {
        onSwipeDown?.();
      }
    } else {
      // Horizontal swipe
      if (deltaX < -threshold) {
        onSwipeLeft?.();
      } else if (deltaX > threshold) {
        onSwipeRight?.();
      }
    }
  }, [onSwipeUp, onSwipeDown, onSwipeLeft, onSwipeRight, threshold, onDragProgress]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
