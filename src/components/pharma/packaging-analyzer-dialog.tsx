
"use client";

import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const { toast } = useToast();

  const resetDialogState = () => {
    setImagePreview(null);
    setImageDataUri(null);
    setError(null);
    setCameraError(null);
    setIsLoading(false);
    setCurrentMode('camera');
    setHasCameraPermission(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    const setupCamera = async () => {
      if (currentMode === 'camera' && open) {
        setCameraError(null);
        setHasCameraPermission(null);
        setImagePreview(null);
        setImageDataUri(null);

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

        if (videoRef.current) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            if (videoRef.current && open && currentMode === 'camera') {
                videoRef.current.srcObject = stream;
                await videoRef.current.play().catch(playError => {
                  console.error("Error playing video stream:", playError);
                  setCameraError(`Could not play camera stream: ${playError.message}. Try uploading a file.`);
                  setHasCameraPermission(false);
                  setCurrentMode('upload');
                  stream.getTracks().forEach(track => track.stop()); // Stop stream if play fails
                   toast({
                    variant: 'destructive',
                    title: 'Camera Playback Error',
                    description: 'Could not start camera video playback.',
                  });
                });
                setCameraStream(stream);
                setHasCameraPermission(true);
            } else {
                stream.getTracks().forEach(track => track.stop());
                if (open && currentMode === 'camera') {
                    setCameraError("Camera setup was interrupted or component state changed. Try uploading a file.");
                    setHasCameraPermission(false);
                    setCurrentMode('upload');
                }
            }
          } catch (err) {
            console.error("Error accessing camera:", err);
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
        } else {
            console.error("PackagingAnalyzerDialog: videoRef.current is null when setupCamera is called.");
            setCameraError("Camera display area not ready. Please try again or use file upload.");
            setHasCameraPermission(false);
            setCurrentMode('upload');
            toast({
              variant: 'destructive',
              title: 'Camera Initialization Error',
              description: 'Could not initialize camera view. Switched to upload mode.',
            });
        }
      }
    };

    if (open) { // Only attempt setup if dialog is open
        setupCamera();
    }

    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
    };
  }, [open, currentMode]);


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
      return;
    }
    setIsLoading(true);
    setParentLoading(true);
    setError(null);
    try {
      const result: AnalyzePackagingOutput = await analyzePackaging({ photoDataUri: imageDataUri });
      onAnalysisComplete(result.authenticity);
      onOpenChange(false);
    } catch (err) {
      console.error("Packaging analysis error:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during analysis.";
      setError(errorMessage);
      onAnalysisError(errorMessage);
    } finally {
      setIsLoading(false);
      setParentLoading(false);
    }
  };

  const handleDialogClose = () => {
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        handleDialogClose();
        resetDialogState(); // Reset state when dialog is fully closed
      } else {
        onOpenChange(true); // Ensure parent knows it's open
        // Reset state when opening, ensuring camera mode is default
        // This is important if the dialog was previously in upload/preview
        if (currentMode !== 'camera') {
           resetDialogState(); // this will set currentMode to 'camera'
        } else {
            // If already in camera mode, explicitly trigger camera setup or permission check again
            // This helps if permissions were changed while dialog was closed
            setHasCameraPermission(null); 
            setCameraError(null);
        }
      }
    }}>
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

          {/* Camera Mode View - visibility controlled by CSS */}
          <div className={`${currentMode === 'camera' ? 'block' : 'hidden'} space-y-3`}>
            <div className="w-full aspect-video bg-muted rounded-md overflow-hidden relative flex items-center justify-center">
              {/* Video element is always in the DOM if dialog is open, for ref stability */}
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
              {/* Overlays for loading/error states, shown conditionally */}
              {hasCameraPermission === null && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                      <Loader2 className="h-12 w-12 text-primary-foreground animate-spin" />
                      <p className="text-primary-foreground mt-2">Initializing camera...</p>
                  </div>
              )}
              {hasCameraPermission === false && cameraError && (
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
              onClick={() => setCurrentMode('upload')}
              className="w-full"
              disabled={isLoading}
            >
              <FileUp className="mr-2 h-4 w-4" /> Switch to File Upload
            </Button>
          </div>

          {/* Upload Mode View - visibility controlled by CSS */}
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
                    // When switching back to camera, explicitly reset camera state to trigger re-init
                    setHasCameraPermission(null);
                    setCameraError(null);
                  }}
                  className="w-full"
                  disabled={isLoading}
              >
                  <Video className="mr-2 h-4 w-4" /> Switch to Camera Capture
              </Button>
           </div>

          {/* Preview Mode View - conditional rendering as before, as it depends on imagePreview */}
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
                    // When going back to camera for retake, explicitly reset camera state
                    setHasCameraPermission(null);
                    setCameraError(null);
                  }}
                  className="w-full"
                  disabled={isLoading}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" /> Retake/Recapture
                </Button>
                 <Button
                  variant="outline"
                  onClick={() => setCurrentMode('upload')}
                  className="w-full"
                  disabled={isLoading}
                >
                  <FileUp className="mr-2 h-4 w-4" /> Upload Different
                </Button>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mt-2">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
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
