'use client';

import { useEffect, useRef, useCallback } from 'react';

interface ScanListenerOptions {
  enabled?: boolean;
  onScan: (code: string) => void;
  minLength?: number;
  maxTimeBetweenChars?: number;
}

/**
 * Hook to detect barcode scanner input (keyboard wedge mode)
 *
 * Distinguishes between scanner and manual typing by measuring speed:
 * - Hardware scanners type FAST (< 100ms between chars)
 * - Manual typing is SLOW (> 200ms between chars)
 *
 * @param enabled - Enable/disable listener (useful during loading states)
 * @param onScan - Callback fired when Enter key pressed after fast typing
 * @param minLength - Minimum barcode length to consider valid (default: 3)
 * @param maxTimeBetweenChars - Max ms between chars to count as scanner (default: 100)
 */
export function useScanListener({
  enabled = true,
  onScan,
  minLength = 3,
  maxTimeBetweenChars = 100,
}: ScanListenerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const clearBuffer = useCallback(() => {
    bufferRef.current = '';
    lastKeyTimeRef.current = 0;
  }, []);

  useEffect(() => {
    if (!enabled) {
      clearBuffer();
      return;
    }

    const handleKeyPress = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;

      // Clear timeout on new key
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // If Enter key, check if we have a valid scan
      if (e.key === 'Enter') {
        e.preventDefault();
        const code = bufferRef.current.trim();

        if (code.length >= minLength) {
          onScan(code);
        }

        clearBuffer();
        return;
      }

      // Ignore modifier keys
      if (e.key.length > 1 && e.key !== 'Enter') {
        return;
      }

      // If typing too slow, it's manual input - clear buffer
      if (lastKeyTimeRef.current > 0 && timeSinceLastKey > maxTimeBetweenChars) {
        bufferRef.current = e.key;
      } else {
        bufferRef.current += e.key;
      }

      lastKeyTimeRef.current = now;

      // Auto-clear buffer after 1s of inactivity
      timeoutRef.current = setTimeout(clearBuffer, 1000);
    };

    window.addEventListener('keypress', handleKeyPress);

    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, onScan, minLength, maxTimeBetweenChars, clearBuffer]);

  return { clearBuffer };
}
