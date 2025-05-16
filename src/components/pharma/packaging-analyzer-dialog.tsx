
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
    setCurrentMode('camera'); // Reset to camera mode
    setHasCameraPermission(null); // Will re-check permission on next open/mode switch
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    // Active camera stream is cleaned up by useEffect for cameraStream
  };
  
  useEffect(() => {
    const setupCamera = async () => {
      if (currentMode === 'camera' && open) {
        setCameraError(null);
        setHasCameraPermission(null);
        setImagePreview(null); // Clear previous preview when switching to camera
        setImageDataUri(null);

        if (videoRef.current) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            videoRef.current.srcObject = stream;
            await videoRef.current.play(); // Ensure video plays
            setCameraStream(stream);
            setHasCameraPermission(true);
          } catch (err) {
            console.error("Error accessing camera:", err);
            const camErrorMsg = err instanceof Error ? err.message : "Unknown camera error.";
            setCameraError(`Camera access denied or unavailable: ${camErrorMsg}`);
            setHasCameraPermission(false);
            setCurrentMode('upload'); // Fallback to upload mode
            toast({
              variant: 'destructive',
              title: 'Camera Access Failed',
              description: 'Please enable camera permissions or upload a file.',
            });
          }
        }
      }
    };

    setupCamera();

    return () => { // Cleanup: stop camera stream
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
    };
  }, [open, currentMode, toast]); // Removed cameraStream from deps to avoid loop

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
        const dataUri = canvas.toDataURL('image/jpeg', 0.9); // Use JPEG for smaller size
        setImagePreview(dataUri);
        setImageDataUri(dataUri);
        setError(null);
        setCurrentMode('preview');
        // Stream is stopped by useEffect when currentMode changes from 'camera'
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
      onOpenChange(false); // Close dialog on success
      // resetDialogState(); // State resets when dialog reopens due to 'open' prop change
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
      // resetDialogState(); // Reset state when dialog is manually closed.
      // Stream cleanup is handled by useEffect on 'open' state change.
      onOpenChange(false);
    }
  };
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleDialogClose(); else onOpenChange(true);
      if (!isOpen) resetDialogState(); // Ensure reset when closing
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

          {currentMode === 'camera' && (
            <div className="space-y-3">
              <div className="w-full aspect-video bg-muted rounded-md overflow-hidden relative flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                {hasCameraPermission === false && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 p-4">
                    <XCircle className="h-12 w-12 text-destructive mb-2" />
                    <p className="text-destructive-foreground text-center">Camera permission denied or camera not found.</p>
                  </div>
                )}
                 {hasCameraPermission === null && !cameraError && ( // Loading state for camera
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                        <Loader2 className="h-12 w-12 text-primary-foreground animate-spin" />
                        <p className="text-primary-foreground mt-2">Initializing camera...</p>
                    </div>
                )}
              </div>
              {cameraError && !hasCameraPermission && ( // Show specific camera error if permission is false
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Camera Error</AlertTitle>
                  <AlertDescription>{cameraError}</AlertDescription>
                </Alert>
              )}
              <Button 
                onClick={handleCaptureImage} 
                className="w-full"
                disabled={isLoading || !hasCameraPermission || !cameraStream}
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
          )}

          {currentMode === 'upload' && (
             <div className="space-y-3">
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
                    onClick={() => setCurrentMode('camera')} 
                    className="w-full"
                    disabled={isLoading}
                >
                    <Video className="mr-2 h-4 w-4" /> Switch to Camera Capture
                </Button>
             </div>
          )}

          {currentMode === 'preview' && imagePreview && (
            <div className="space-y-3">
              <div className="mt-4 border rounded-md overflow-hidden aspect-video relative w-full bg-muted">
                <Image src={imagePreview} alt="Packaging Preview" layout="fill" objectFit="contain" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentMode('camera')} 
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
          
          {error && ( // General error unrelated to camera init
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
