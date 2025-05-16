
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
  scanType?: string; // e.g., "QR Code", "Barcode"
}

const SCANNER_ELEMENT_ID = "html5qr-code-full-region";

export function QrBarcodeScannerDialog({
  open,
  onOpenChange,
  onScanSuccess,
  scanType = "Code",
}: QrBarcodeScannerDialogProps) {
  const activeScannerInstanceRef = useRef<Html5QrcodeScanner | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // Ensure the div exists before rendering.
      const scannerElement = document.getElementById(SCANNER_ELEMENT_ID);
      if (!scannerElement) {
        console.warn(`Scanner element #${SCANNER_ELEMENT_ID} not found during init.`);
        setError("Scanner UI element not ready. Please try closing and reopening the scanner.");
        return;
      }
      
      // If there's an existing scanner instance (e.g. from a previous quick open/close), try to clear it first.
      if (activeScannerInstanceRef.current) {
        activeScannerInstanceRef.current.clear().catch(err => {
          console.warn("QR Scanner: Failed to clear pre-existing scanner instance.", err);
        });
        activeScannerInstanceRef.current = null;
      }

      const formatsToSupport = [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.ITF,
      ];

      const html5QrcodeScanner = new Html5QrcodeScanner(
        SCANNER_ELEMENT_ID,
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdge * 0.7); // Use 70% of the smaller edge
            return { width: qrboxSize, height: qrboxSize };
          },
          rememberLastUsedCamera: true,
          supportedScanTypes: [], 
          formatsToSupport: formatsToSupport,
        },
        false // verbose
      );

      const successCallback: QrcodeSuccessCallback = (decodedText, result) => {
        // Scanner will be cleared in the cleanup function of this effect instance.
        onScanSuccess(decodedText);
        onOpenChange(false); // This triggers cleanup & re-render
      };

      const errorCallback: QrcodeErrorCallback = (errorMessage) => {
         if (!errorMessage.toLowerCase().includes("qr code parse error") && 
             !errorMessage.toLowerCase().includes("not found") &&
             !errorMessage.toLowerCase().includes("unable to query supported devices")) { // Filter common benign messages
            setError(`Scanner error: ${errorMessage}`);
         }
      };
      
      html5QrcodeScanner.render(successCallback, errorCallback)
        .catch(err => {
            console.error("Error rendering scanner:", err);
            setError(`Failed to render scanner: ${err instanceof Error ? err.message : String(err)}`);
        });
      activeScannerInstanceRef.current = html5QrcodeScanner;
      setError(null); // Clear previous errors on successful render
    }

    // Cleanup function for this specific effect instance
    return () => {
      if (activeScannerInstanceRef.current) {
        activeScannerInstanceRef.current.clear().catch(err => {
          // This error can happen if the DOM element is already removed, e.g., on fast navigation
          // console.warn("QR Scanner: Failed to clear scanner during cleanup. This is often benign if dialog is closing.", err);
        });
        activeScannerInstanceRef.current = null;
      }
    };
  }, [open, onScanSuccess, onOpenChange, scanType]);
  
  const handleClose = () => {
    // onOpenChange(false) will trigger the useEffect cleanup which handles clearing the scanner.
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
        <div className="p-2 aspect-[4/3] w-full bg-muted min-h-[300px]"> {/* Added min-h for stability */}
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
