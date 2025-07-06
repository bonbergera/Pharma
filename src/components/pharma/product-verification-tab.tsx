"use client";  

// Import necessary types from React  
import type { ChangeEvent, FormEvent } from 'react';  
// Import React hooks  
import React, { useState, useCallback } from 'react';  
// Import UI components  
import { Input } from "@/components/ui/input";  
import { Button } from "@/components/ui/button";  
import { Label } from "@/components/ui/label";  
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";  
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";  
// Import icons  
import { Camera, Loader2, ShieldCheck, ShieldAlert, ShieldX, Eye, XCircle, ScanBarcode } from "lucide-react";  
// Import barcode scanner dialog component  
import { QrBarcodeScannerDialog } from './qr-barcode-scanner-dialog';  
// Import packaging analyzer dialog component  
import { PackagingAnalyzerDialog } from './packaging-analyzer-dialog';  
// Import types for product and analysis results  
import type { PackagingAnalysisResult, Product } from '@/types';  
// Import toast notification hook  
import { useToast } from "@/hooks/use-toast";  

// Define possible verification statuses  
type VerificationStatus = "idle" | "verified" | "not_found" | "error";  

export function ProductVerificationTab() {  
  // State variables for serial number, verification, analysis, and dialogs visibility  
  const [serialNumber, setSerialNumber] = useState('');  
  const [isVerifyingSerial, setIsVerifyingSerial] = useState(false);  
  const [isAnalyzingPackaging, setIsAnalyzingPackaging] = useState(false);  
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);  
  const [showPackagingAnalyzer, setShowPackagingAnalyzer] = useState(false);  
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>("idle");  
  const [productDetails, setProductDetails] = useState<Product | null>(null);  
  const [analysisResult, setAnalysisResult] = useState<PackagingAnalysisResult | null>(null);  
  const { toast } = useToast();  

  // Callback for handling successful barcode scan  
  const handleBarcodeScanSuccess = useCallback((decodedText: string) => {  
    setShowBarcodeScanner(false); // Close scanner dialog  
    setSerialNumber(decodedText.toUpperCase()); // Populate serial number  
    setVerificationStatus("idle"); // Reset verification status  
    setProductDetails(null); // Clear product details  
    setAnalysisResult(null); // Clear analysis result  
    toast({  
      title: "Barcode Scanned",  
      description: "Serial number populated. Click 'Verify Product'.",  
    });  
  }, [toast]);  

  // Callback for handling completed AI packaging analysis  
  const handlePackagingAnalysisComplete = useCallback((result: PackagingAnalysisResult) => {  
    setAnalysisResult(result); // Update analysis result  
    toast({  
      title: "Packaging Analysis Complete",  
      description: result.isAuthentic ? "Packaging appears authentic." : "Packaging authenticity concerns.",  
      variant: result.isAuthentic ? "default" : "destructive",  
    });  
  }, [toast]);  

  // Callback for handling errors during AI packaging analysis  
  const handlePackagingAnalysisError = useCallback((errorMsg: string) => {  
    toast({  
      title: "AI Packaging Analysis Error",  
      description: errorMsg || "An unknown error occurred during AI analysis.",  
      variant: "destructive",  
    });  
  }, [toast]);  

  // Function to handle verification form submission  
  const handleSubmitVerification = async (event?: FormEvent) => {  
    event?.preventDefault(); // Prevent default form submission  
    if (!serialNumber) {  
      // Show toast if serial number is missing  
      toast({  
        title: "Missing Serial Number",  
        description: "Please enter or scan a serial number.",  
        variant: "destructive",  
      });  
      return;  
    }  
    setIsVerifyingSerial(true); // Show verification in progress  
    setVerificationStatus("idle"); // Reset verification status  
    setProductDetails(null); // Clear previous product details  

    try {  
      // Fetch product data based on serial number  
      const response = await fetch(`/api/products/${encodeURIComponent(serialNumber)}`);  
      
      if (response.ok) {  
        // If product exists, populate details  
        const product: Product = await response.json();  
        setProductDetails(product);  
        setVerificationStatus("verified");  
        toast({  
          title: "Product Verified",  
          description: `Serial Number ${product.serialNumber} is authentic.`,  
          action: <ShieldCheck className="text-green-500" />,  
        });  
      } else if (response.status === 404) {  
       // If product not found  
        setVerificationStatus("not_found");  
        toast({  
          title: "Product Not Found",  
          description: `Serial Number ${serialNumber} is not found in the registry.`,  
          variant: "destructive",  
          action: <ShieldAlert className="text-yellow-500" />,  
        });  
      } else {  
        // Handle other errors  
        const errorResult = await response.json().catch(() => ({ message: "An unknown error occurred during verification." }));  
        setVerificationStatus("error");  
        toast({  
          title: "Verification Failed",  
          description: errorResult.message || "Failed to verify product.",  
          variant: "destructive",  
          action: <XCircle className="text-red-500" />,  
        });  
      }  
    } catch (error) {  
      // Catch network or fetch errors  
      console.error("Verification submission error:", error);  
      setVerificationStatus("error");  
      toast({  
        title: "Verification Error",  
        description: "Could not connect to the server. Please try again later.",  
        variant: "destructive",  
        action: <XCircle className="text-red-500" />,  
      });  
    } finally {  
      setIsVerifyingSerial(false); // Hide verification progress  
    }  
  };  

  // Function to render verification result UI  
  const renderVerificationResult = () => {  
    // If verification status is idle and no analysis or product details, show nothing  
    if (verificationStatus === "idle" && !analysisResult && !productDetails) return null;  

    return (  
      <div className="mt-6 space-y-4">  
        {/* Show product details if verified */}  
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
        {/* Show not found alert if product isn't in registry */}  
        {verificationStatus === "not_found" && (  
          <Alert variant="destructive">  
            <ShieldX className="h-5 w-5" />  
            <AlertTitle>Product Not Found</AlertTitle>  
            <AlertDescription>  
              The serial number {serialNumber} was not found in our registry. Please check the serial number and try again.  
            </AlertDescription>  
          </Alert>  
        )}  
        {/* Show error alert if verification error occurred */}  
        {verificationStatus === "error" && !productDetails && (  
          <Alert variant="destructive">  
            <XCircle className="h-5 w-5" />  
            <AlertTitle>Verification Error</AlertTitle>  
            <AlertDescription>  
              An error occurred while trying to verify the product. Please try again later.  
            </AlertDescription>  
          </Alert>  
        )}  
        {/* Show AI packaging analysis results if available */}  
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

   {/* Main component rendering */}
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
                {/* Serial Number input */}
                <div className="space-y-2">
                  <Label htmlFor="serialNumberVerify">Serial Number</Label>
                  <Input
                    id="serialNumberVerify"
                    placeholder="Enter or scan serial number"
                    value={serialNumber}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setSerialNumber(e.target.value.toUpperCase()); // Convert to uppercase
                      setVerificationStatus("idle"); // Reset status
                      setProductDetails(null);
                      setAnalysisResult(null);
                    }}
                    required
                    className="text-base"
                    pattern="[A-Z0-9]{8,20}"
                    title="Serial number must be 8-20 uppercase alphanumeric characters."
                  />
                </div>
                {/* Buttons section: scan barcode, analyze packaging, verify product */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {/* Scan Barcode button */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowBarcodeScanner(true)}
                    className="w-full text-base py-3"
                  >
                    <ScanBarcode className="mr-2 h-5 w-5" /> Scan Barcode
                  </Button>
                  {/* AI Packaging Analysis button */}
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
                  {/* Verify Product button */}
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
              {/* Render verification or analysis results */}
              {renderVerificationResult()}
            </CardContent>
            {/* Barcode scanner dialog */}
            <QrBarcodeScannerDialog
              open={showBarcodeScanner}
              onOpenChange={setShowBarcodeScanner}
              onScanSuccess={handleBarcodeScanSuccess}
              scanType="Barcode"
            />
            {/* Packaging analysis dialog */}
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