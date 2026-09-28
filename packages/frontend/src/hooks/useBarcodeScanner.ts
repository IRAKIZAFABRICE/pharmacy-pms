// packages/frontend/src/hooks/useBarcodeScanner.ts
import { useEffect, useState, useCallback } from 'react';

interface UseBarcodeScannerOptions {
  /** Time in ms to wait before resetting the barcode buffer */
  timeout?: number;
  /** Minimum barcode length to consider valid */
  minLength?: number;
  /** Character to trigger scan completion */
  endChar?: string;
}

export function useBarcodeScanner(
  onScan: (barcode: string) => void,
  options: UseBarcodeScannerOptions = {}
) {
const { 
  timeout = 200, 
  minLength = 3, 
  endChar = 'Enter' 
} = options;
  const [barcode, setBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [lastKeyTime, setLastKeyTime] = useState(0);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Ignore if typing in input field
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const currentTime = Date.now();
    const timeDiff = currentTime - lastKeyTime;

    // If too long between keystrokes, reset
    if (timeDiff > timeout && barcode.length > 0) {
      setBarcode('');
      setIsScanning(false);
    }

    setLastKeyTime(currentTime);

    // Handle Enter key - completes the scan
    if (event.key === endChar) {
      if (barcode.length >= minLength) {
        onScan(barcode);
        setBarcode('');
        setIsScanning(false);
      }
      return;
    }

    // Ignore modifier keys
    if (event.key.length > 1 || event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    // Start scanning
    if (!isScanning) {
      setIsScanning(true);
      setBarcode('');
    }

    // Append character to barcode
    setBarcode(prev => prev + event.key);

    // Auto-complete if barcode is long enough (some scanners don't send Enter)
    if (barcode.length >= 20) {
      onScan(barcode + event.key);
      setBarcode('');
      setIsScanning(false);
    }
  }, [barcode, isScanning, lastKeyTime, onScan, timeout, minLength, endChar]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  // Reset barcode scanner manually
  const resetScanner = useCallback(() => {
    setBarcode('');
    setIsScanning(false);
  }, []);

  return {
    barcode,
    isScanning,
    resetScanner,
  };
}