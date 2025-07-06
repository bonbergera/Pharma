
"use client";

import React, { useState, useRef, ChangeEvent, useEffect, useCallback } from 'react';
import Image from 'next/image';
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Camera, Upload, Loader2, X, CheckCircle2, XCircle, Video, FileUp, RefreshCcw } from "lucide-react";
import { analyzePackaging } from '@/ai/flows/analyze-packaging';
import type { AnalyzePackagingOutput } from '@/ai/flows/analyze-packaging';
import type { PackagingAnalysisResult } from '@/types';
import { useToast } from "@/hooks/use-toast";

interface PackagingAnalyzerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnalysisComplete: (result: PackagingAnalysisResult) => void;
  onAnalysisError: (errorMessage: string) => void;
  setParentLoading: (loading: boolean) => void;
}

export function PackagingAnalyzerDialog({
  open,
  onOpenChange,
  onAnalysisComplete,
  onAnalysisError,
  setParentLoading,
}: PackagingAnalyzerDialogProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentMode, setCurrentMode] = useState<'camera' | 'preview' | 'upload'>('camera');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const { toast } = useToast();

  const [isVideoElementReady, setIsVideoElementReady] = useState(false);

  const videoElementRefCallback = useCallback((node: HTMLVideoElement | null) => {
    if (node) {
      videoRef.current = node;
      setIsVideoElementReady(true);
      console.log("PackagingAnalyzerDialog: Video element mounted and ref set.");
    } else {
      // videoRef.current = null; // Already handled by useRef
      setIsVideoElementReady(false);
      console.log("PackagingAnalyzerDialog: Video element unmounted.");
    }
  }, []);


  const resetDialogState = () => {
    setImagePreview(null);
    setImageDataUri(null);
    setError(null);
    setCameraError(null);
    setIsLoading(false);
    setCurrentMode('camera');
    setHasCameraPermission(null); // Reset camera permission status
    // isVideoElementReady will be reset by the ref callback if element unmounts/remounts
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    const setupCamera = async () => {
      console.log(`PackagingAnalyzerDialog: setupCamera called. Mode: ${currentMode}, Open: ${open}, VideoReady: ${isVideoElementReady}`);
      if (currentMode === 'camera' && open && isVideoElementReady && videoRef.current) {
        console.log("PackagingAnalyzerDialog: Attempting to setup camera.");
        setCameraError(null);
        setHasCameraPermission(null);
        // Reset image only if not already set by a previous capture in this session
        if (!imagePreview) {
            setImageDataUri(null);
        }


        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError("Camera API not supported by this browser. Please try uploading a file.");
          setHasCameraPermission(false);
          setCurrentMode('upload');
          toast({
            variant: 'destructive',
            title: 'Camera Not Supported',
            description: 'Your browser does not support camera access. Please upload a file.',
          });
          return;
        }

        // videoRef.current should be valid here due to isVideoElementReady check
        try {
          console.log("PackagingAnalyzerDialog: Requesting camera permission.");
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          
          // Double check if still in camera mode and component is mounted
          if (videoRef.current && open && currentMode === 'camera') {
              console.log("PackagingAnalyzerDialog: Assigning stream to video element.");
              videoRef.current.srcObject = stream;
              await videoRef.current.play().catch(playError => {
                console.error("PackagingAnalyzerDialog: Error playing video stream:", playError);
                setCameraError(`Could not play camera stream: ${playError.message}. Try uploading a file.`);
                setHasCameraPermission(false);
                setCurrentMode('upload');
                stream.getTracks().forEach(track => track.stop()); 
                 toast({
                  variant: 'destructive',
                  title: 'Camera Playback Error',
                  description: 'Could not start camera video playback.',
                });
              });
              setCameraStream(stream);
              setHasCameraPermission(true);
              console.log("PackagingAnalyzerDialog: Camera setup successful.");
          } else {
              console.log("PackagingAnalyzerDialog: Camera setup aborted (state changed or component unmounted). Stopping stream.");
              stream.getTracks().forEach(track => track.stop());
              if (open && currentMode === 'camera') { // If still intended to be in camera mode but something went wrong
                  setCameraError("Camera setup was interrupted. Try uploading a file.");
                  setHasCameraPermission(false);
                  setCurrentMode('upload');
              }
          }
        } catch (err) {
          console.error("PackagingAnalyzerDialog: Error accessing camera:", err);
          const camErrorMsg = err instanceof Error ? err.message : "Unknown camera error.";
          setCameraError(`Camera access denied or unavailable: ${camErrorMsg}. Try uploading a file.`);
          setHasCameraPermission(false);
          setCurrentMode('upload');
          toast({
            variant: 'destructive',
            title: 'Camera Access Failed',
            description: 'Please enable camera permissions or upload a file.',
          });
        }
      } else if (currentMode === 'camera' && open && !isVideoElementReady) {
          console.warn("PackagingAnalyzerDialog: In camera mode, dialog open, but video element not ready yet.");
          // We wait for isVideoElementReady to become true
      } else if (currentMode === 'camera' && open && isVideoElementReady && !videoRef.current) {
          // This case should theoretically not happen if isVideoElementReady is true
          // because the callback sets videoRef.current. But as a safeguard:
          console.error("PackagingAnalyzerDialog: videoRef.current is null despite isVideoElementReady being true. This indicates a logic issue in ref handling.");
          setCameraError("Internal error: Camera view reference lost. Try upload mode.");
          setHasCameraPermission(false);
          setCurrentMode('upload');
      }
    };

    if (open) {
        setupCamera();
    }

    return () => {
      if (cameraStream) {
        console.log("PackagingAnalyzerDialog: Cleanup - stopping camera stream.");
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
    };
  }, [open, currentMode, isVideoElementReady, toast]); // Removed imagePreview from deps


  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError("Invalid file type. Please upload an image.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError("File is too large. Maximum size is 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setImagePreview(dataUri);
        setImageDataUri(dataUri);
        setError(null);
        setCurrentMode('preview');
      };
      reader.onerror = () => setError("Failed to read file.");
      reader.readAsDataURL(file);
    }
  };

  const handleCaptureImage = () => {
    if (videoRef.current && canvasRef.current && cameraStream && videoRef.current.readyState >= videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg', 0.9);
        setImagePreview(dataUri);
        setImageDataUri(dataUri);
        setError(null);
        setCurrentMode('preview');
      } else {
        setError("Could not get canvas context to capture image.");
        toast({ variant: "destructive", title: "Capture Failed", description: "Could not prepare image for capture." });
      }
    } else {
      setError("Camera not ready or stream unavailable for capture.");
      toast({ variant: "destructive", title: "Capture Failed", description: "Camera feed is not available or ready." });
    }
  };

  const handleAnalyze = async () => {
    if (!imageDataUri) {
      setError("Please capture or upload an image first.");
      toast({ variant: "destructive", title: "No Image", description: "Please capture or upload an image before analyzing." });
      return;
    }
    setIsLoading(true);
    setParentLoading(true);
    setError(null);
    try {
      console.log("PackagingAnalyzerDialog: Sending image for analysis...");
      const result: AnalyzePackagingOutput = await analyzePackaging({ photoDataUri: imageDataUri });
      console.log("PackagingAnalyzerDialog: Analysis result received:", result);

      if (result && result.authenticity) {
        onAnalysisComplete(result.authenticity);
        onOpenChange(false); // This will trigger reset via handleOpenChangeWithReset
      } else {
        const errorMessage = "AI analysis returned an unexpected result structure. Please try again.";
        console.error("PackagingAnalyzerDialog: AI flow returned an invalid or incomplete result structure.", result);
        setError(errorMessage);
        onAnalysisError(errorMessage); // This now uses the more specific toast in parent
        // toast({ variant: "destructive", title: "Analysis Failed", description: errorMessage }); // Removed duplicate toast
      }
    } catch (err: any) {
      console.error("PackagingAnalyzerDialog: Packaging analysis error (exception caught):", err);
      if (err.stack) {
        console.error("Stack trace:", err.stack);
      }
      if (typeof err === 'object' && err !== null) {
        console.error("Full error object:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
      }
      
      const errorMessage = err.message || "An unknown error occurred during AI packaging analysis.";
      setError(errorMessage);
      onAnalysisError(errorMessage); 
    } finally {
      setIsLoading(false);
      setParentLoading(false);
    }
  };

  const handleDialogClose = () => {
    if (!isLoading) { 
      onOpenChange(false); // This will trigger reset via handleOpenChangeWithReset
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  const handleOpenChangeWithReset = (isOpen: boolean) => {
      if (!isOpen) {
        if (!isLoading) { 
          resetDialogState();
        }
        onOpenChange(false);
      } else { 
        resetDialogState(); 
        onOpenChange(true);
      }
  };


  return (
    <Dialog open={open} onOpenChange={handleOpenChangeWithReset}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">Analyze Product Packaging</DialogTitle>
          <DialogDescription>
            {currentMode === 'camera' && 'Position packaging in front of the camera and capture.'}
            {currentMode === 'upload' && 'Upload an image of the product packaging.'}
            {currentMode === 'preview' && 'Review the captured/uploaded image below.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          <canvas ref={canvasRef} className="hidden"></canvas>
          <Input
            id="packagingImage"
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
          />

          <div className={`${currentMode === 'camera' ? 'block' : 'hidden'} space-y-3`}>
            <div className="w-full aspect-video bg-muted rounded-md overflow-hidden relative flex items-center justify-center">
              {/* Video element with ref callback */}
              <video ref={videoElementRefCallback} className="w-full h-full object-cover" autoPlay muted playsInline />
              
              {/* Overlays: Only show loading if permission is null AND video element is ready. 
                  If video element is not ready, the setup is still pending. */}
              {isVideoElementReady && hasCameraPermission === null && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                      <Loader2 className="h-12 w-12 text-primary-foreground animate-spin" />
                      <p className="text-primary-foreground mt-2">Initializing camera...</p>
                  </div>
              )}
              {hasCameraPermission === false && cameraError && ( // Show error overlay if permission denied/error
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 p-4">
                  <XCircle className="h-12 w-12 text-destructive" />
                </div>
              )}
            </div>
            {hasCameraPermission === false && cameraError && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Camera Error</AlertTitle>
                <AlertDescription>{cameraError}</AlertDescription>
              </Alert>
            )}
            <Button
              onClick={handleCaptureImage}
              className="w-full"
              disabled={isLoading || hasCameraPermission !== true || !cameraStream}
            >
              <Camera className="mr-2 h-4 w-4" /> Capture Image
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (cameraStream) { // Stop existing stream before switching mode
                    cameraStream.getTracks().forEach(track => track.stop());
                    setCameraStream(null);
                }
                setCurrentMode('upload');
                setHasCameraPermission(null); // Reset for next camera attempt
                setCameraError(null);
              }}
              className="w-full"
              disabled={isLoading}
            >
              <FileUp className="mr-2 h-4 w-4" /> Switch to File Upload
            </Button>
          </div>

          <div className={`${currentMode === 'upload' ? 'block' : 'hidden'} space-y-3`}>
              <div
                  className="mt-4 p-8 border-2 border-dashed rounded-md flex flex-col items-center justify-center aspect-video cursor-pointer hover:border-primary transition-colors bg-muted/50"
                  onClick={triggerFileInput}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && triggerFileInput()}
              >
                  <Upload className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Click to upload image</p>
                  <p className="text-xs text-muted-foreground mt-1">Max 5MB. PNG, JPG, WEBP.</p>
              </div>
              <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentMode('camera');
                    // Resetting these will trigger the useEffect for camera setup
                    setHasCameraPermission(null); 
                    setCameraError(null);
                    // isVideoElementReady will be handled by its ref callback if element remounts
                  }}
                  className="w-full"
                  disabled={isLoading}
              >
                  <Video className="mr-2 h-4 w-4" /> Switch to Camera Capture
              </Button>
           </div>

          {currentMode === 'preview' && imagePreview && (
            <div className="space-y-3">
              <div className="mt-4 border rounded-md overflow-hidden aspect-video relative w-full bg-muted">
                <Image src={imagePreview} alt="Packaging Preview" layout="fill" objectFit="contain" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentMode('camera');
                    setHasCameraPermission(null);
                    setCameraError(null);
                    //setImagePreview(null); // Clear preview for retake
                    //setImageDataUri(null);
                  }}
                  className="w-full"
                  disabled={isLoading}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" /> Retake/Recapture
                </Button>
                 <Button
                  variant="outline"
                  onClick={() => {
                     if (cameraStream) { // Ensure stream is stopped if user came from camera mode
                        cameraStream.getTracks().forEach(track => track.stop());
                        setCameraStream(null);
                    }
                    setCurrentMode('upload');
                    setHasCameraPermission(null);
                    setCameraError(null);
                    //setImagePreview(null); // Clear preview for new upload
                    //setImageDataUri(null);
                  }}
                  className="w-full"
                  disabled={isLoading}
                >
                  <FileUp className="mr-2 h-4 w-4" /> Upload Different
                </Button>
              </div>
            </div>
          )}

          {error && ( // This error is for the AI analysis part
            <Alert variant="destructive" className="mt-2">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error During Analysis</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleDialogClose} disabled={isLoading}>
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
          <Button
            onClick={handleAnalyze}
            disabled={!imageDataUri || isLoading || currentMode === 'camera'}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            {isLoading ? "Analyzing..." : "Analyze Packaging"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

