
"use client";

import type { ChangeEvent, FormEvent } from 'react';
import React, { useState, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Barcode, Loader2, CheckCircle2, XCircle, ScanBarcode } from "lucide-react";
import { QrBarcodeScannerDialog } from './qr-barcode-scanner-dialog';
import type { ScannedProductData } from '@/types';
import { useToast } from "@/hooks/use-toast";

export function ProductRegistrationTab() {
  const [serialNumber, setSerialNumber] = useState('');
  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const { toast } = useToast();

  const handleScanSuccess = useCallback((decodedText: string) => {
    setShowScanner(false);
    try {
      const parsedData: ScannedProductData | any = JSON.parse(decodedText);
      if (typeof parsedData === 'object' && parsedData !== null && parsedData.serialNumber) {
        setSerialNumber(parsedData.serialNumber.toUpperCase());
        setName(parsedData.name || '');
        setManufacturer(parsedData.manufacturer || '');
        toast({
          title: "Barcode Scanned",
          description: "Product details populated from scanned barcode.",
          variant: "default",
        });
      } else if (typeof parsedData === 'string') {
         setSerialNumber(parsedData.toUpperCase());
         toast({
          title: "Barcode Scanned",
          description: "Serial number populated from scanned barcode.",
          variant: "default",
        });
      } else { 
        setSerialNumber(decodedText.toUpperCase());
        toast({
          title: "Barcode Scanned",
          description: "Serial number populated. Please fill other details if needed.",
          variant: "default",
        });
      }
    } catch (error) {
      setSerialNumber(decodedText.toUpperCase());
      toast({
        title: "Barcode Scanned",
        description: "Serial number populated. Please fill other details if needed.",
        variant: "default",
      });
    }
  }, [toast]);

  const validateForm = () => {
    if (!serialNumber || !name || !manufacturer) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return false;
    }
    const serialNumberRegex = /^[A-Z0-9]{8,20}$/; 
    if (!serialNumberRegex.test(serialNumber)) {
      toast({
        title: "Invalid Serial Number",
        description: "Serial number must be 8-20 uppercase alphanumeric characters.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serialNumber, name, manufacturer }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Product Registered",
          description: `${result.product.name} (SN: ${result.product.serialNumber}) has been successfully registered.`,
          action: <CheckCircle2 className="text-green-500" />,
        });
        setSerialNumber('');
        setName('');
        setManufacturer('');
      } else {
        toast({
          title: "Registration Failed",
          description: result.message || "An error occurred during registration.",
          variant: "destructive",
          action: <XCircle className="text-red-500" />,
        });
      }
    } catch (error) {
      console.error("Registration submission error:", error);
      toast({
        title: "Registration Error",
        description: "Could not connect to the server. Please try again later.",
        variant: "destructive",
        action: <XCircle className="text-red-500" />,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Register New Product</CardTitle>
        <CardDescription>
          Fill in the product details below or scan a barcode to begin. Ensure serial number is 8-20 uppercase alphanumeric characters.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="serialNumberReg">Serial Number</Label>
            <Input
              id="serialNumberReg"
              placeholder="e.g., SNX12345678"
              value={serialNumber}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSerialNumber(e.target.value.toUpperCase())}
              required
              className="text-base"
              pattern="[A-Z0-9]{8,20}"
              title="Serial number must be 8-20 uppercase alphanumeric characters."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="productNameReg">Product Name</Label>
            <Input
              id="productNameReg"
              placeholder="e.g., Amoxicillin 250mg"
              value={name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              required
              className="text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manufacturerReg">Manufacturer</Label>
            <Input
              id="manufacturerReg"
              placeholder="e.g., PharmaCorp Inc."
              value={manufacturer}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setManufacturer(e.target.value)}
              required
              className="text-base"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowScanner(true)}
              className="w-full sm:w-auto text-base py-3"
            >
              <ScanBarcode className="mr-2 h-5 w-5" /> Scan Barcode
            </Button>
            <Button type="submit" disabled={isLoading} className="w-full sm:flex-1 bg-accent hover:bg-accent/90 text-accent-foreground text-base py-3">
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-5 w-5" />
              )}
              {isLoading ? "Registering..." : "Register Product"}
            </Button>
          </div>
        </form>
      </CardContent>
      <QrBarcodeScannerDialog
        open={showScanner}
        onOpenChange={setShowScanner}
        onScanSuccess={handleScanSuccess}
        scanType="Barcode"
      />
    </Card>
  );
}
