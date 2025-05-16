
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
  scanType = "Barcode", // Default to "Barcode"
}: QrBarcodeScannerDialogProps) {
  const activeScannerInstanceRef = useRef<Html5QrcodeScanner | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const scannerElement = document.getElementById(SCANNER_ELEMENT_ID);
      if (!scannerElement) {
        console.warn(`Scanner element #${SCANNER_ELEMENT_ID} not found during init.`);
        setError("Scanner UI element not ready. Please try closing and reopening the scanner.");
        return;
      }
      
      if (activeScannerInstanceRef.current) {
        activeScannerInstanceRef.current.clear().catch(err => {
          console.warn("Scanner: Failed to clear pre-existing scanner instance.", err);
        });
        activeScannerInstanceRef.current = null;
      }

      // Specify only barcode formats
      const formatsToSupport = [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.ITF,
        // Html5QrcodeSupportedFormats.DATA_MATRIX, // Example of another 2D, not typically "barcode"
        // Html5QrcodeSupportedFormats.PDF_417, // Example of another 2D
      ];

      const html5QrcodeScanner = new Html5QrcodeScanner(
        SCANNER_ELEMENT_ID,
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            // For barcodes, a wider aspect ratio for qrbox might be better.
            // However, html5-qrcode's qrbox is always a square. 
            // We can make it a percentage of width if we expect mostly landscape scanning.
            // Let's keep it simple for now with a square based on min edge.
            const qrboxSize = Math.floor(minEdge * 0.7);
            return { width: qrboxSize, height: qrboxSize };
          },
          rememberLastUsedCamera: true,
          supportedScanTypes: [], // Let library decide based on formatsToSupport
          formatsToSupport: formatsToSupport,
        },
        false // verbose
      );

      const successCallback: QrcodeSuccessCallback = (decodedText, result) => {
        onScanSuccess(decodedText);
        onOpenChange(false); 
      };

      const errorCallback: QrcodeErrorCallback = (errorMessage) => {
         if (!errorMessage.toLowerCase().includes("not found") &&
             !errorMessage.toLowerCase().includes("unable to query supported devices")) { 
            setError(`Scanner error: ${errorMessage}`);
         } else {
            // Clear benign "not found" errors quickly to avoid user confusion
            if (error) setError(null);
         }
      };
      
      html5QrcodeScanner.render(successCallback, errorCallback)
        .then(() => {
          setError(null); // Clear previous errors on successful render
        })
        .catch(err => {
            console.error("Error rendering scanner:", err);
            setError(`Failed to render scanner: ${err instanceof Error ? err.message : String(err)}`);
        });
      activeScannerInstanceRef.current = html5QrcodeScanner;
      
    }

    return () => {
      if (activeScannerInstanceRef.current) {
        activeScannerInstanceRef.current.clear().catch(err => {
          // console.warn("Scanner: Failed to clear scanner during cleanup.", err);
        });
        activeScannerInstanceRef.current = null;
      }
    };
  }, [open, onScanSuccess, onOpenChange, scanType, error]); // Added error to deps to allow clearing it
  
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
