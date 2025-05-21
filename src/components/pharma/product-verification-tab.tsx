
"use client";

import type { ChangeEvent, FormEvent } from 'react';
import React, { useState, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Barcode, Camera, Loader2, ShieldCheck, ShieldAlert, ShieldX, Eye, XCircle, ScanBarcode } from "lucide-react";
import { QrBarcodeScannerDialog } from './qr-barcode-scanner-dialog';
import { PackagingAnalyzerDialog } from './packaging-analyzer-dialog';
import type { PackagingAnalysisResult, Product } from '@/types';
import { useToast } from "@/hooks/use-toast";

type VerificationStatus = "idle" | "verified" | "not_found" | "error";

export function ProductVerificationTab() {
  const [serialNumber, setSerialNumber] = useState('');
  const [isVerifyingSerial, setIsVerifyingSerial] = useState(false);
  const [isAnalyzingPackaging, setIsAnalyzingPackaging] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showPackagingAnalyzer, setShowPackagingAnalyzer] = useState(false);
  
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>("idle");
  const [productDetails, setProductDetails] = useState<Product | null>(null);
  const [analysisResult, setAnalysisResult] = useState<PackagingAnalysisResult | null>(null);
  const { toast } = useToast();

  const handleBarcodeScanSuccess = useCallback((decodedText: string) => {
    setShowBarcodeScanner(false);
    setSerialNumber(decodedText.toUpperCase());
    setVerificationStatus("idle"); // Reset status on new scan
    setProductDetails(null);
    setAnalysisResult(null);
    toast({
      title: "Barcode Scanned",
      description: "Serial number populated. Click 'Verify Product'.",
    });
  }, [toast]);

  const handlePackagingAnalysisComplete = useCallback((result: PackagingAnalysisResult) => {
    setAnalysisResult(result);
    // setIsAnalyzingPackaging(false); // setParentLoading in dialog handles this
    // setShowPackagingAnalyzer(false); // User might want to see result before dialog closes
    toast({
      title: "Packaging Analysis Complete",
      description: result.isAuthentic ? "Packaging appears authentic." : "Packaging authenticity concerns.",
      variant: result.isAuthentic ? "default" : "destructive",
    });
  }, [toast]);
  
  const handlePackagingAnalysisError = useCallback((errorMsg: string) => {
    // setIsAnalyzingPackaging(false); // setParentLoading in dialog handles this
    toast({
      title: "Analysis Error",
      description: errorMsg,
      variant: "destructive",
    });
  }, [toast]);


  const handleSubmitVerification = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!serialNumber) {
      toast({
        title: "Missing Serial Number",
        description: "Please enter or scan a serial number.",
        variant: "destructive",
      });
      return;
    }
    setIsVerifyingSerial(true);
    setVerificationStatus("idle");
    setProductDetails(null);
    // setAnalysisResult(null); // Keep previous analysis result unless a new one is explicitly run

    try {
      const response = await fetch(`/api/products/${encodeURIComponent(serialNumber)}`);
      
      if (response.ok) {
        const product: Product = await response.json();
        setProductDetails(product);
        setVerificationStatus("verified");
        toast({
          title: "Product Verified",
          description: `Serial Number ${product.serialNumber} is authentic.`,
          action: <ShieldCheck className="text-green-500" />,
        });
      } else if (response.status === 404) {
        setVerificationStatus("not_found");
        toast({
          title: "Product Not Found",
          description: `Serial Number ${serialNumber} is not found in the registry.`,
          variant: "destructive",
          action: <ShieldAlert className="text-yellow-500" />,
        });
      } else {
        const errorResult = await response.json().catch(() => ({ message: "An unknown error occurred" }));
        setVerificationStatus("error");
        toast({
          title: "Verification Failed",
          description: errorResult.message || "Failed to verify product.",
          variant: "destructive",
          action: <XCircle className="text-red-500" />,
        });
      }
    } catch (error) {
      console.error("Verification submission error:", error);
      setVerificationStatus("error");
      toast({
        title: "Verification Error",
        description: "Could not connect to the server. Please try again later.",
        variant: "destructive",
        action: <XCircle className="text-red-500" />,
      });
    } finally {
      setIsVerifyingSerial(false);
    }
  };

  const renderVerificationResult = () => {
    if (verificationStatus === "idle" && !analysisResult && !productDetails) return null;

    return (
      <div className="mt-6 space-y-4">
        {productDetails && verificationStatus === "verified" && (
          <Alert variant="default" className="border-green-500 bg-green-50 dark:bg-green-900/30">
             <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-700 dark:text-green-300">Product Authenticated by Serial Number!</AlertTitle>
            <AlertDescription className="text-green-600 dark:text-green-400">
              <strong>Name:</strong> {productDetails.name} <br />
              <strong>Manufacturer:</strong> {productDetails.manufacturer} <br />
              <strong>Serial Number:</strong> {productDetails.serialNumber} is registered and authentic.
            </AlertDescription>
          </Alert>
        )}
        {verificationStatus === "not_found" && (
          <Alert variant="destructive">
            <ShieldX className="h-5 w-5" />
            <AlertTitle>Product Not Found</AlertTitle>
            <AlertDescription>
              The serial number {serialNumber} was not found in our registry. Please check the serial number and try again.
            </AlertDescription>
          </Alert>
        )}
         {verificationStatus === "error" && !productDetails && ( // Only show generic error if no product details
          <Alert variant="destructive">
            <XCircle className="h-5 w-5" />
            <AlertTitle>Verification Error</AlertTitle>
            <AlertDescription>
              An error occurred while trying to verify the product. Please try again later.
            </AlertDescription>
          </Alert>
        )}

        {analysisResult && (
          <Alert variant={analysisResult.isAuthentic ? "default" : "destructive"} className={analysisResult.isAuthentic ? "border-green-500 bg-green-50 dark:bg-green-900/30" : ""}>
            {analysisResult.isAuthentic ? <Eye className="h-5 w-5 text-green-600 dark:text-green-400" /> : <ShieldAlert className="h-5 w-5"/>}
            <AlertTitle className={analysisResult.isAuthentic ? "text-green-700 dark:text-green-300" : ""}>AI Packaging Analysis</AlertTitle>
            <AlertDescription className={analysisResult.isAuthentic ? "text-green-600 dark:text-green-400" : ""}>
              <strong>Authenticity:</strong> {analysisResult.isAuthentic ? "Appears Authentic" : "Potential Concerns"} <br />
              <strong>Confidence:</strong> {(analysisResult.confidence * 100).toFixed(0)}% <br />
              <strong>Reason:</strong> {analysisResult.reason}
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Verify Product Authenticity</CardTitle>
        <CardDescription>
          Enter the product serial number or use scanners to verify. Serial numbers are uppercase alphanumeric.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmitVerification} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="serialNumberVerify">Serial Number</Label>
            <Input
              id="serialNumberVerify"
              placeholder="Enter or scan serial number"
              value={serialNumber}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSerialNumber(e.target.value.toUpperCase())}
              required
              className="text-base"
              pattern="[A-Z0-9]{8,20}"
              title="Serial number must be 8-20 uppercase alphanumeric characters."
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowBarcodeScanner(true)}
              className="w-full text-base py-3"
            >
              <ScanBarcode className="mr-2 h-5 w-5" /> Scan Barcode
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPackagingAnalyzer(true)}
              disabled={isAnalyzingPackaging}
              className="w-full text-base py-3"
            >
              {isAnalyzingPackaging ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Camera className="mr-2 h-5 w-5" />}
              {isAnalyzingPackaging ? "Analyzing..." : "Scan Packaging (AI)"}
            </Button>
            <Button type="submit" disabled={isVerifyingSerial || isAnalyzingPackaging} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-base py-3">
              {isVerifyingSerial ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 h-5 w-5" />
              )}
              {isVerifyingSerial ? "Verifying..." : "Verify Product"}
            </Button>
          </div>
        </form>
        {renderVerificationResult()}
      </CardContent>

      <QrBarcodeScannerDialog
        open={showBarcodeScanner}
        onOpenChange={setShowBarcodeScanner}
        onScanSuccess={handleBarcodeScanSuccess}
        scanType="Barcode"
      />
      <PackagingAnalyzerDialog
        open={showPackagingAnalyzer}
        onOpenChange={setShowPackagingAnalyzer}
        onAnalysisComplete={handlePackagingAnalysisComplete}
        onAnalysisError={handlePackagingAnalysisError}
        setParentLoading={setIsAnalyzingPackaging}
      />
    </Card>
  );
}
