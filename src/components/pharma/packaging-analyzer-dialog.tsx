"use client";

import React, { useState, useRef, ChangeEvent } from 'react';
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
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Camera, Upload, Loader2, X, CheckCircle2, XCircle } from "lucide-react";
import { analyzePackaging } from '@/ai/flows/analyze-packaging';
import type { AnalyzePackagingOutput } from '@/ai/flows/analyze-packaging';
import type { PackagingAnalysisResult } from '@/types';

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

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size (optional but recommended)
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
        setImageDataUri(dataUri); // Store the full data URI
        setError(null);
      };
      reader.onerror = () => {
        setError("Failed to read file.");
      }
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!imageDataUri) {
      setError("Please select or capture an image first.");
      return;
    }
    setIsLoading(true);
    setParentLoading(true);
    setError(null);

    try {
      const result: AnalyzePackagingOutput = await analyzePackaging({ photoDataUri: imageDataUri });
      onAnalysisComplete(result.authenticity);
      resetDialogState();
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
  
  const resetDialogState = () => {
    setImagePreview(null);
    setImageDataUri(null);
    setError(null);
    setIsLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset file input
    }
  };

  const handleDialogClose = () => {
    if (!isLoading) { // Prevent closing while loading
      resetDialogState();
      onOpenChange(false);
    }
  };
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Analyze Product Packaging</DialogTitle>
          <DialogDescription>
            Capture or upload an image of the product packaging for AI-powered authenticity analysis.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 my-4">
          <Input
            id="packagingImage"
            type="file"
            accept="image/*"
            capture="environment" // Prioritize rear camera on mobile
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden" // Hide the default input, use button to trigger
          />
          
          {imagePreview ? (
            <div className="mt-4 border rounded-md overflow-hidden aspect-video relative w-full bg-muted">
              <Image src={imagePreview} alt="Packaging Preview" layout="fill" objectFit="contain" />
            </div>
          ) : (
            <div 
              className="mt-4 p-8 border-2 border-dashed rounded-md flex flex-col items-center justify-center aspect-video cursor-pointer hover:border-primary transition-colors bg-muted/50"
              onClick={triggerFileInput}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && triggerFileInput()}
            >
              <Camera className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Click to capture or upload image</p>
              <p className="text-xs text-muted-foreground mt-1">Max 5MB. PNG, JPG, WEBP accepted.</p>
            </div>
          )}
          
          <Button 
            variant="outline" 
            onClick={triggerFileInput} 
            className="w-full"
            disabled={isLoading}
          >
            <Upload className="mr-2 h-4 w-4" /> {imagePreview ? "Change Image" : "Select Image"}
          </Button>

          {error && (
            <Alert variant="destructive">
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
          <Button onClick={handleAnalyze} disabled={!imagePreview || isLoading} className="bg-accent hover:bg-accent/90 text-accent-foreground">
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
