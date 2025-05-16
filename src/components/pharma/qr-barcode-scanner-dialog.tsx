
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
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import type { QrcodeSuccessCallback, QrcodeErrorCallback } from 'html5-qrcode/esm/core';
import { X } from 'lucide-react';

interface QrBarcodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: (decodedText: string) => void;
  scanType?: string; // e.g., "Barcode"
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
    let initTimeoutId: NodeJS.Timeout | null = null;

    if (open) {
      initTimeoutId = setTimeout(() => {
        const scannerElement = document.getElementById(SCANNER_ELEMENT_ID);

        if (!scannerElement) {
          console.error(`Scanner UI element #${SCANNER_ELEMENT_ID} not found even after delay.`);
          setError("Scanner UI element not ready. Please try closing and reopening the scanner. If the problem persists, check browser console for errors.");
          return;
        }
        
        setError(null); 

        if (activeScannerInstanceRef.current) {
            activeScannerInstanceRef.current.clear().catch(err => {
                console.warn("Scanner: Cleared a pre-existing scanner instance before new render.", err);
            });
            activeScannerInstanceRef.current = null;
        }

        const formatsToSupport = [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
        ];

        try {
          const html5QrcodeScanner = new Html5QrcodeScanner(
            SCANNER_ELEMENT_ID,
            {
              fps: 10,
              qrbox: (viewfinderWidth, viewfinderHeight) => {
                const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                const qrboxSize = Math.floor(minEdge * 0.7);
                return { width: qrboxSize, height: qrboxSize };
              },
              rememberLastUsedCamera: true,
              supportedScanTypes: [], 
              formatsToSupport: formatsToSupport,
            },
            true // ENABLE VERBOSE LOGGING
          );

          const successCallback: QrcodeSuccessCallback = (decodedText, result) => {
            // Ensure the component is still mounted and dialog is open before acting
            if (activeScannerInstanceRef.current) { 
              onScanSuccess(decodedText);
              onOpenChange(false); 
            }
          };

          const localErrorCallback: QrcodeErrorCallback = (errorMessage) => {
             if (!errorMessage.toLowerCase().includes("not found") &&
                 !errorMessage.toLowerCase().includes("unable to query supported devices") &&
                 !errorMessage.toLowerCase().includes("undefined or null")) { 
                // console.warn("Scanner runtime notice:", errorMessage);
             }
          };
          
          // Assign to ref *before* render, so cleanup can find it if render fails synchronously
          activeScannerInstanceRef.current = html5QrcodeScanner; 

          const renderPromise = html5QrcodeScanner.render(successCallback, localErrorCallback);

          if (renderPromise && typeof renderPromise.then === 'function') {
            renderPromise
              .then(() => {
                // Successfully rendered. Instance is already in ref.
              })
              .catch(renderPromiseError => {
                  console.error("Error from scanner.render() Promise:", renderPromiseError);
                  setError(`Scanner render failed: ${renderPromiseError instanceof Error ? renderPromiseError.message : String(renderPromiseError)}`);
              });
          } else {
            // This is the scenario: render() did not return a promise.
            console.error("Html5QrcodeScanner.render() did not return a Promise. This indicates an issue with the scanner's internal state or a library bug. Check verbose logs in the console.", html5QrcodeScanner);
            setError("Scanner failed to start. The render method did not behave as expected. See browser console for details.");
          }
          
        } catch (scannerInitError) { // Catches errors from 'new Html5QrcodeScanner' or synchronous errors from 'render' itself
          console.error("Error during scanner instantiation or synchronous render call:", scannerInitError);
          setError(`Scanner initialization error: ${scannerInitError instanceof Error ? scannerInitError.message : String(scannerInitError)}`);
        }
      }, 150); // Slightly increased delay just in case

    } else {
      if (activeScannerInstanceRef.current) {
        activeScannerInstanceRef.current.clear().catch(err => {
          // console.warn("Scanner: Failed to clear scanner instance on dialog close.", err);
        });
        activeScannerInstanceRef.current = null;
      }
      if (error) setError(null);
    }

    return () => {
      if (initTimeoutId) {
        clearTimeout(initTimeoutId);
      }
      if (activeScannerInstanceRef.current) {
        activeScannerInstanceRef.current.clear().catch(err => {
          // console.warn("Scanner: Failed to clear scanner instance in effect cleanup.", err);
        });
        activeScannerInstanceRef.current = null;
      }
    };
  }, [open, onScanSuccess, onOpenChange, scanType]);
  
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
