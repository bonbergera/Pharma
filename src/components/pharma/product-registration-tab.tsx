"use client";

import type { ChangeEvent, FormEvent } from 'react';
import React, { useState, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { QrCode, Loader2, CheckCircle2, XCircle } from "lucide-react";
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
        setSerialNumber(parsedData.serialNumber);
        setName(parsedData.name || '');
        setManufacturer(parsedData.manufacturer || '');
        toast({
          title: "QR Code Scanned",
          description: "Product details populated from QR code.",
          variant: "default",
        });
      } else if (typeof parsedData === 'string') {
         setSerialNumber(parsedData);
         toast({
          title: "QR Code Scanned",
          description: "Serial number populated from QR code.",
          variant: "default",
        });
      } else {
        throw new Error("Invalid QR code format for registration.");
      }
    } catch (error) {
      // If parsing fails, assume the decoded text is the serial number
      setSerialNumber(decodedText);
      toast({
        title: "QR Code Scanned",
        description: "Serial number populated. Please fill other details.",
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
    const serialNumberRegex = /^[A-Z0-9]{8,20}$/; // Adjusted regex for more flexibility
    if (!serialNumberRegex.test(serialNumber)) {
      toast({
        title: "Invalid Serial Number",
        description: "Serial number must be 8-20 alphanumeric characters.",
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
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);

    // Mock success
    toast({
      title: "Product Registered",
      description: `${name} (SN: ${serialNumber}) has been successfully registered.`,
      action: <CheckCircle2 className="text-green-500" />,
    });
    setSerialNumber('');
    setName('');
    setManufacturer('');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Register New Product</CardTitle>
        <CardDescription>
          Fill in the product details below or scan a QR code to begin.
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
              <QrCode className="mr-2 h-5 w-5" /> Scan QR Code
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
        scanType="QR Code"
      />
    </Card>
  );
}
