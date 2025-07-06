"use client";

// Import necessary types from React
import { ChangeEvent, FormEvent } from 'react';
// Import React hooks
import React, { useState, useCallback } from 'react';
// Import UI components
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// Import icons
import { Barcode, Loader2, CheckCircle2 } from "lucide-react"; 
// Import barcode scanner dialog component
import { QrBarcodeScannerDialog } from './qr-barcode-scanner-dialog';
// Import toast notification hook
import { useToast } from "@/hooks/use-toast";

export function ProductRegistrationTab() {
  // State variables for form inputs and UI control
  const [serialNumber, setSerialNumber] = useState('');
  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const { toast } = useToast();

  // Callback function to handle successful barcode scan
  const handleScanSuccess = useCallback((decodedText: string) => {
    setShowScanner(false); // Close scanner dialog
    try {
      const parsedData: any = JSON.parse(decodedText); // Try to parse scanned data as JSON
      if (parsedData && typeof parsedData === 'object' && parsedData.serialNumber) {
        // If JSON contains serialNumber, populate form fields
        setSerialNumber(parsedData.serialNumber);
        setName(parsedData.name || '');
        setManufacturer(parsedData.manufacturer || '');
        toast({
          title: "Barcode Scanned",
          description: "Product details populated from scanned barcode.",
          variant: "default",
        });
      } else if (typeof parsedData === 'string') {
        // If JSON is just a string, treat as serial number
        setSerialNumber(parsedData);
        toast({
          title: "Barcode Scanned",
          description: "Serial number populated from scanned barcode.",
          variant: "default",
        });
      } else {
        // If JSON structure is unexpected
        setSerialNumber(decodedText);
        toast({
          title: "Barcode Scanned",
          description: "Serial number populated. Please fill other details if needed.",
          variant: "default",
        });
      }
    } catch {
      // If JSON parsing fails, treat decoded text as serial number
      setSerialNumber(decodedText);
      toast({
        title: "Barcode Scanned",
        description: "Serial number populated. Please fill other details if needed.",
        variant: "default",
      });
    }
  }, [toast]);

  // Function to validate form inputs
  const validateForm = () => {
    // Check for empty fields
    if (!serialNumber || !name || !manufacturer) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return false; // Validation failed
    }
    // Check serial number format (8-20 alphanumeric characters)
    const serialNumberRegex = /^[A-Z0-9]{8,20}$/; 
    if (!serialNumberRegex.test(serialNumber)) {
      toast({
        title: "Invalid Serial Number",
        description: "Serial number must be 8-20 alphanumeric characters.",
        variant: "destructive",
      });
      return false; // Validation failed
    }
    return true; // Validation successful
  };

  // Handle form submission
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault(); // Prevent default form submit

    // Log data for debugging
    console.log('Submitting form with data:', { serialNumber, name, manufacturer });

    // Validate form inputs
    if (!validateForm()) return; // Exit if validation fails

    setIsLoading(true); // Show loading indicator
    try {
      // Send POST request to API
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serialNumber,
          name,
          manufacturer,
        }),
      });
      const data = await response.json(); // Parse response data

      if (response.ok) {
        // Show success toast if registration succeeded
        toast({
          title: "Product Registered",
          description: `${name} (SN: ${serialNumber}) has been successfully registered.`,
          action: <CheckCircle2 className="text-green-500" />,
        });
        // Reset form fields after success
        setSerialNumber('');
        setName('');
        setManufacturer('');
      } else {
        // Show error toast if API responded with error
        toast({
          title: "Error",
          description: data?.error || "Failed to register product.",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Catch and report network errors
      console.error('Fetch error:', error);
      toast({
        title: "Network Error",
        description: "Could not connect to the server.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false); // Hide loading indicator
    }
  };

  // Render the registration form UI
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Register New Product</CardTitle>
        <CardDescription>
          Fill in the product details below or scan a barcode to begin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Serial Number input field */}
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
          {/* Product Name input field */}
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
          {/* Manufacturer input field */}
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
          {/* Buttons for barcode scanning and form submission */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {/* Button to open barcode scanner dialog */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowScanner(true)}
              className="w-full sm:w-auto text-base py-3"
            >
              <Barcode className="mr-2 h-5 w-5" /> Scan Barcode
            </Button>
            {/* Submit button to register product */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full sm:flex-1 bg-accent hover:bg-accent/90 text-accent-foreground text-base py-3"
            >
              {/* Show spinner if loading, otherwise icon */}
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
      {/* Barcode scanner dialog component */}
      <QrBarcodeScannerDialog
        open={showScanner}
        onOpenChange={setShowScanner}
        onScanSuccess={handleScanSuccess}
        scanType="Barcode"
      />
    </Card>
  );
}