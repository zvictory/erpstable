'use client';

import { useGlobalKeyboard } from '@/hooks/useGlobalKeyboard';

export function GlobalKeyboardHandler() {
  useGlobalKeyboard();
  return null; // Doesn't render anything
}
