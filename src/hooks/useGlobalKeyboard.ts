'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useGlobalKeyboard() {
  const router = useRouter();

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Check if any modal/dialog is open
        // shadcn/ui dialogs add [data-state="open"] to the dialog element
        const openDialog = document.querySelector('[role="dialog"][data-state="open"]');

        if (openDialog) {
          // Modal is open - trigger close button click
          const closeButton = openDialog.querySelector('[aria-label="Close"]') as HTMLButtonElement;
          if (closeButton) {
            closeButton.click();
            return;
          }

          // Fallback: dispatch ESC to the dialog
          openDialog.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Escape',
            bubbles: true,
            cancelable: true
          }));
        } else {
          // No modal open - navigate back
          router.back();
        }
      }
    };

    // Add global listener
    window.addEventListener('keydown', handleEscape);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [router]);
}
