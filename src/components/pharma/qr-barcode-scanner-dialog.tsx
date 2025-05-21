
"use client";

import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Html5QrcodeScanner, 
  Html5QrcodeSupportedFormats,
  Html5QrcodeScanType // Imported
} from 'html5-qrcode';
import type { QrcodeSuccessCallback, QrcodeErrorCallback } from 'html5-qrcode/esm/core';
import { X } from 'lucide-react';

interface QrBarcodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: (decodedText: string) => void;
  scanType?: string; 
}

const SCANNER_ELEMENT_ID = "html5qr-code-full-region";

export function QrBarcodeScannerDialog({
  open,
  onOpenChange,
  onScanSuccess,
  scanType = "Barcode",
}: QrBarcodeScannerDialogProps) {
  const activeScannerInstanceRef = useRef<Html5QrcodeScanner | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let currentEffectScannerInstance: Html5QrcodeScanner | null = null;
    let initTimeoutId: NodeJS.Timeout | null = null;

    if (open) {
      // Delay initialization slightly to ensure DOM is ready
      initTimeoutId = setTimeout(() => {
        // Guard against race condition: if dialog was closed quickly
        if (!open) {
          return;
        }

        if (activeScannerInstanceRef.current) {
          activeScannerInstanceRef.current.clear().catch(err => {
            console.warn("QrBarcodeScannerDialog: Previous active scanner instance clear failed on new init:", err);
          });
          activeScannerInstanceRef.current = null;
        }

        const scannerElement = document.getElementById(SCANNER_ELEMENT_ID);
        if (!scannerElement) {
          console.error(`QrBarcodeScannerDialog: Scanner UI element #${SCANNER_ELEMENT_ID} not found even after delay.`);
          setError("Scanner UI element not ready. Please try closing and reopening the scanner. If the problem persists, check browser console for errors.");
          return;
        }
        
        setError(null); // Clear previous errors

        const formatsToSupport = [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
          // Html5QrcodeSupportedFormats.QR_CODE, // Keeping this commented as per previous request to focus on barcodes
        ];

        try {
          currentEffectScannerInstance = new Html5QrcodeScanner(
            SCANNER_ELEMENT_ID,
            {
              fps: 10,
              qrbox: (viewfinderWidth, viewfinderHeight) => {
                const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                const qrboxSize = Math.floor(minEdge * 0.7);
                return { width: qrboxSize, height: qrboxSize };
              },
              rememberLastUsedCamera: true,
              supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA], // Explicitly set scan type
              formatsToSupport: formatsToSupport,
            },
            true // ENABLE VERBOSE LOGGING (was third argument)
          );
        } catch (scannerInitError) {
          console.error("QrBarcodeScannerDialog: Error during Html5QrcodeScanner instantiation:", scannerInitError);
          setError(`Scanner instantiation failed: ${scannerInitError instanceof Error ? scannerInitError.message : String(scannerInitError)}`);
          return; 
        }
        
        activeScannerInstanceRef.current = currentEffectScannerInstance;

        const successCallback: QrcodeSuccessCallback = (decodedText, result) => {
          // Ensure the callback is for the currently active scanner and dialog is still open
          if (activeScannerInstanceRef.current === currentEffectScannerInstance && open) { 
            onScanSuccess(decodedText);
            onOpenChange(false); // Close dialog on success
          }
        };

        const localErrorCallback: QrcodeErrorCallback = (errorMessage) => {
           // Filter out common "not found" messages during scanning to reduce console noise
           // but log other potential runtime errors from the scanner.
           if (!errorMessage.toLowerCase().includes("not found") &&
               !errorMessage.toLowerCase().includes("unable to query supported devices") && // Often a transient issue or permission denial start
               !errorMessage.toLowerCase().includes("undefined or null")) { // Catches some generic library internal errors
              // console.warn("Scanner runtime notice (filtered):", errorMessage);
           }
        };
          
        // Attempt to render the scanner
        try {
          const renderPromise = currentEffectScannerInstance.render(successCallback, localErrorCallback);

          // CRITICAL CHECK: html5-qrcode's render() method SHOULD return a Promise.
          // If it doesn't, something is fundamentally wrong with the scanner's state or initialization.
          if (renderPromise && typeof renderPromise.then === 'function') {
            renderPromise
              .catch(renderPromiseError => {
                  console.error("QrBarcodeScannerDialog: Error from scanner.render() Promise:", renderPromiseError);
                  setError(`Scanner render failed: ${renderPromiseError instanceof Error ? renderPromiseError.message : String(renderPromiseError)}`);
                  if (activeScannerInstanceRef.current === currentEffectScannerInstance) {
                    // Attempt to clear the problematic instance
                    activeScannerInstanceRef.current?.clear().catch(()=>{});
                    activeScannerInstanceRef.current = null;
                  }
              });
          } else {
            // This is the branch that logs your specific error
            console.error("QrBarcodeScannerDialog: Html5QrcodeScanner.render() did not return a Promise. This indicates an issue with the scanner's internal state or a library bug. Check verbose logs in the console. Scanner instance:", currentEffectScannerInstance, "Target Element:", scannerElement);
            setError("Scanner failed to start. The render method did not behave as expected. See browser console for details.");
            if (activeScannerInstanceRef.current === currentEffectScannerInstance) {
                 currentEffectScannerInstance?.clear().catch(e => console.warn("QrBarcodeScannerDialog: Clear failed for problematic instance after non-promise return from render", e));
                 activeScannerInstanceRef.current = null;
            }
          }
        } catch (renderError) {
           // Catch synchronous errors from the render call itself
           console.error("QrBarcodeScannerDialog: Synchronous error from scanner.render() call:", renderError);
           setError(`Scanner render call failed synchronously: ${renderError instanceof Error ? renderError.message : String(renderError)}`);
           if (activeScannerInstanceRef.current === currentEffectScannerInstance) {
             activeScannerInstanceRef.current?.clear().catch(()=>{});
             activeScannerInstanceRef.current = null;
           }
        }
      }, 150); // Delay to allow DOM to settle

    } else {
      // Dialog is not open, ensure any active scanner is cleared
      if (activeScannerInstanceRef.current) {
        activeScannerInstanceRef.current.clear().catch(err => {
          // console.warn("Scanner: Clearing lingering active scanner instance as dialog is not open.", err);
        });
        activeScannerInstanceRef.current = null;
      }
      if (error) setError(null); // Clear error when dialog is closed
    }

    // Cleanup function for the useEffect hook
    return () => {
      if (initTimeoutId) {
        clearTimeout(initTimeoutId);
      }
      // This check is important: only clear the instance this effect was responsible for,
      // and only if it's still the active one.
      if (currentEffectScannerInstance) {
        currentEffectScannerInstance.clear().catch(err => {
          // console.warn("Scanner: Failed to clear currentEffectScannerInstance in effect cleanup.", err);
        });
        if (activeScannerInstanceRef.current === currentEffectScannerInstance) {
          activeScannerInstanceRef.current = null;
        }
      }
    };
  }, [open, onScanSuccess, onOpenChange, scanType]); // Dependencies for the effect
  
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-2xl">Scan {scanType}</DialogTitle>
          <DialogDescription>
            Position the {scanType.toLowerCase()} within the frame. The scan will happen automatically.
          </DialogDescription>
        </DialogHeader>
        {/* The div for the scanner UI. Must have a defined size for the library to work. */}
        <div className="p-2 aspect-[4/3] w-full bg-muted min-h-[300px]">
          <div id={SCANNER_ELEMENT_ID} className="w-full h-full"></div>
        </div>
        {error && <p className="p-4 text-sm text-destructive text-center">{error}</p>}
        <DialogFooter className="p-6 pt-2">
          <Button variant="outline" onClick={handleClose} className="w-full">
            <X className="mr-2 h-4 w-4" /> Cancel Scan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

