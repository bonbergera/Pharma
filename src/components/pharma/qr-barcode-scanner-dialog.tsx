"use client";

// Import React utilities and hooks
import React, { useEffect, useRef, useState, useCallback } from 'react';

// Import UI components from your design system
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Import Html5Qrcode-related classes and types for scanning
import {
  Html5QrcodeScanner,
  Html5QrcodeSupportedFormats,
  Html5QrcodeScanType,
  Html5Qrcode,
  type QrcodeSuccessCallback,
  type QrcodeErrorCallback,
  type Html5QrcodeFullConfig,
} from 'html5-qrcode';

// Icons used for buttons and UI
import { X, Camera, Upload, ScanSearch } from 'lucide-react';
import Image from 'next/image';

// Custom toast hook for displaying notifications
import { useToast } from "@/hooks/use-toast";

// Props interface for the scanner dialog component
interface QrBarcodeScannerDialogProps {
  open: boolean; // Controls if the dialog is visible
  onOpenChange: (open: boolean) => void; // Callback when dialog open state changes
  onScanSuccess: (decodedText: string) => void; // Callback when scan is successful
  scanType?: string; // Optional scan type label (e.g. "Barcode")
}

// ID for the scanner element in the DOM
const SCANNER_ELEMENT_ID = "html5qr-code-full-region";

// Main scanner dialog component
export function QrBarcodeScannerDialog({
  open,
  onOpenChange,
  onScanSuccess,
  scanType = "Barcode",
}: QrBarcodeScannerDialogProps) {
  // References for scanner instances and file input
  const activeScannerInstanceRef = useRef<Html5QrcodeScanner | null>(null);
  const html5QrCodeFileInstanceRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileScanDivRef = useRef<HTMLDivElement | null>(null); // Ref for hidden scan target div

  // Component states
  const [error, setError] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<'camera' | 'upload'>('camera');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScannerDivMounted, setIsScannerDivMounted] = useState(false);

  const { toast } = useToast();

  // Timeout ref for delayed scanner initialization
  const initTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  // Ref callback that tracks when scanner div mounts/unmounts
  const scannerDivRef = useCallback((node: HTMLDivElement | null) => {
    setIsScannerDivMounted(!!node);
  }, []);

  // Effect for initializing/destroying the camera scanner
  useEffect(() => {
    // Clear any existing timeout
    if (initTimeoutIdRef.current) {
      clearTimeout(initTimeoutIdRef.current);
      initTimeoutIdRef.current = null;
    }

    const shouldCameraBeActive = open && currentMode === 'camera' && isScannerDivMounted;

    if (shouldCameraBeActive) {
      if (activeScannerInstanceRef.current) return; // Scanner already active

      // Delay to ensure DOM is fully rendered
      initTimeoutIdRef.current = setTimeout(() => {
        if (!(open && currentMode === 'camera' && isScannerDivMounted)) return;
        if (activeScannerInstanceRef.current) return;

        const scannerElement = document.getElementById(SCANNER_ELEMENT_ID);
        if (!scannerElement) {
          setError(`Scanner UI not ready. Please try closing and reopening.`);
          return;
        }

        // Barcode formats to support
        const formatsToSupportArray = [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
        ];

        // Configuration for the camera scanner
        const scannerConfig = {
          fps: 10,
          qrbox: (vw: number, vh: number) => {
            const minEdge = Math.min(Math.max(1, vw), Math.max(1, vh));
            let qrboxSize = Math.floor(minEdge * 0.8);
            qrboxSize = Math.max(150, Math.min(qrboxSize, minEdge - 40));
            if (qrboxSize <= 0 || minEdge < 100) {
              return { width: Math.max(100, Math.floor(vw * 0.75)), height: Math.max(100, Math.floor(vh * 0.75)) };
            }
            return { width: qrboxSize, height: qrboxSize };
          },
          rememberLastUsedCamera: true,
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          formatsToSupport: formatsToSupportArray,
        };

        try {
          // Initialize and render scanner
          const newScannerInstance = new Html5QrcodeScanner(SCANNER_ELEMENT_ID, scannerConfig, true);

          const successCallback: QrcodeSuccessCallback = (decodedText) => {
            if (open && activeScannerInstanceRef.current === newScannerInstance) {
              onScanSuccess(decodedText);
              onOpenChange(false); // Close dialog
            }
          };

          const errorCallback: QrcodeErrorCallback = (errorMessage) => {
            // Intentionally ignore frequent 'not found' warnings
          };

          newScannerInstance.render(successCallback, errorCallback);
          activeScannerInstanceRef.current = newScannerInstance;
        } catch (initError) {
          setError(`Scanner failed to initialize: ${initError instanceof Error ? initError.message : String(initError)}`);
          activeScannerInstanceRef.current?.clear().catch(() => {});
          activeScannerInstanceRef.current = null;
        }
      }, 250);
    } else {
      // Cleanup scanner if not needed
      if (activeScannerInstanceRef.current) {
        activeScannerInstanceRef.current.clear()
          .catch(() => {})
          .finally(() => { activeScannerInstanceRef.current = null; });
      }
    }

    // Cleanup effect on unmount or dependencies change
    return () => {
      if (initTimeoutIdRef.current) {
        clearTimeout(initTimeoutIdRef.current);
        initTimeoutIdRef.current = null;
      }
      if (activeScannerInstanceRef.current) {
        activeScannerInstanceRef.current.clear()
          .catch(() => {})
          .finally(() => { activeScannerInstanceRef.current = null; });
      }
    };
  }, [open, currentMode, isScannerDivMounted, onScanSuccess, onOpenChange]);

  // Close button handler
  const handleClose: () => void = () => {
    onOpenChange(false);
  };

  // Handle file upload and validate input
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError("Invalid file type. Please upload an image.");
        setImagePreview(null);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("File is too large. Maximum size is 5MB.");
        setImagePreview(null);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setError(null);
      };
      reader.onerror = () => {
        setError("Failed to read file.");
        setImagePreview(null);
      }
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  // Handle barcode scanning from uploaded image file
  const handleScanFromFile = async () => {
    if (!fileInputRef.current?.files?.length) {
      setError("Please select an image file first.");
      return;
    }
    const file = fileInputRef.current.files[0];
    setError(null);

    if (!fileScanDivRef.current) {
  setError("Scanner target div not found. Please try again.");
  return;
}

if (!html5QrCodeFileInstanceRef.current) {
  const fileScannerConfig = { verbose: false };

  // Create a unique id for the hidden div if not already set
  if (fileScanDivRef.current && !fileScanDivRef.current.id) {
    fileScanDivRef.current.id = "hidden-file-scan-div";
  }

  // Ensure the div is rendered before using it
  await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 30)));

  if (!fileScanDivRef.current || !fileScanDivRef.current.id) {
    setError("Scanner div not mounted. Please try again.");
    return;
  }

  html5QrCodeFileInstanceRef.current = new Html5Qrcode(fileScanDivRef.current.id, fileScannerConfig);
}


    try {
      const decodedText = await html5QrCodeFileInstanceRef.current.scanFile(file, false);
      onScanSuccess(decodedText);
      onOpenChange(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Could not decode barcode from image.";
      const userFriendly = errorMsg.toLowerCase().includes("not found") || errorMsg.toLowerCase().includes("qr code not found");
      setError(userFriendly ? "No barcode found in the image or format not supported." : errorMsg);
      toast({
        variant: "destructive",
        title: "Scan Failed",
        description: userFriendly ? "No barcode found in the image." : errorMsg,
      });
    }
  };

  // Effect to reset UI state on dialog open/close
  useEffect(() => {
    if (!open) {
      setImagePreview(null);
      setError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      setError(null);
      if (currentMode === 'camera') {
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  }, [open, currentMode]);
  // Ensure the hidden file scan div is painted before it's accessed
useEffect(() => {
  if (currentMode === 'upload' && fileScanDivRef.current) {
    // Force layout calculation to ensure the element is painted
    const _ = fileScanDivRef.current.offsetHeight;
  }
}, [currentMode]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-2xl">Scan {scanType}</DialogTitle>
          <DialogDescription>
            {currentMode === 'camera'
              ? `Position the ${scanType.toLowerCase()} within the frame.`
              : `Upload an image containing the ${scanType.toLowerCase()}.`}
          </DialogDescription>
        </DialogHeader>

        {/* Scanner view when using camera */}
        {open && currentMode === 'camera' && (
          <div className="p-2 aspect-[4/3] w-full bg-muted min-h-[300px]">
            <div id={SCANNER_ELEMENT_ID} className="w-full h-full" ref={scannerDivRef} />
          </div>
        )}

        {/* File upload mode */}
        {currentMode === 'upload' && (
          <div className="p-6 space-y-4">
            <Input
              id="barcodeImageFile"
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            {imagePreview && (
              <div className="mt-4 border rounded-md overflow-hidden aspect-video relative w-full bg-muted">
                <Image src={imagePreview} alt="Barcode Preview" layout="fill" objectFit="contain" />
              </div>
            )}
            <Button onClick={handleScanFromFile} disabled={!imagePreview} className="w-full">
              <ScanSearch className="mr-2 h-4 w-4" /> Scan from Image
            </Button>
          </div>
        )}

        {/* Error message display */}
        {error && <p className="p-4 text-sm text-destructive text-center">{error}</p>}

        {/* Footer buttons */}
        <DialogFooter className="p-6 pt-2 flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (currentMode === 'camera' && activeScannerInstanceRef.current) {
                activeScannerInstanceRef.current.clear()
                  .catch(() => {})
                  .finally(() => {
                    activeScannerInstanceRef.current = null;
                    setCurrentMode('upload');
                  });
              } else {
                setCurrentMode(currentMode === 'camera' ? 'upload' : 'camera');
              }
            }}
            className="w-full sm:w-auto"
          >
            {currentMode === 'camera' ? <Upload className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
            {currentMode === 'camera' ? 'Switch to File Upload' : 'Switch to Camera Scan'}
          </Button>
          <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
        </DialogFooter>

        {/* Hidden div needed for file scan mode */}
<div ref={fileScanDivRef} style={{ display: "none" }} />

      </DialogContent>
    </Dialog>
  );
}
