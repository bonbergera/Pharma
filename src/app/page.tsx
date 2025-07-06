import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductRegistrationTab } from "@/components/pharma/product-registration-tab";
import { ProductVerificationTab } from "@/components/pharma/product-verification-tab";
import { Barcode, ShieldCheck, PackagePlus } from "lucide-react";

export default function PharmaChainVerifierPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:px-8 md:py-12 min-h-screen flex flex-col items-center">
      <header className="mb-10 text-center">
        <div className="flex items-center justify-center mb-3">
          <PackagePlus className="h-12 w-12 text-primary" /> 
          <h1 className="ml-3 text-4xl md:text-5xl font-bold text-primary tracking-tight">PharmaChain Verifier</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Securely register and verify pharmaceutical products using cutting-edge AI and blockchain principles.
        </p>
      </header>

      <Tabs defaultValue="register" className="w-full max-w-2xl shadow-xl rounded-lg overflow-hidden bg-card">
        <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 h-14">
          <TabsTrigger value="register" className="h-full text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
            <Barcode className="mr-2 h-5 w-5" /> Register Product {/* Changed QrCode icon to Barcode */}
          </TabsTrigger>
          <TabsTrigger value="verify" className="h-full text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
            <ShieldCheck className="mr-2 h-5 w-5" /> Verify Product
          </TabsTrigger>
        </TabsList>
        <TabsContent value="register" className="p-6 md:p-8">
          <ProductRegistrationTab />
        </TabsContent>
        <TabsContent value="verify" className="p-6 md:p-8">
          <ProductVerificationTab />
        </TabsContent>
      </Tabs>
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} PharmaChain Verifier. All rights reserved.</p>
        <p>Ensuring authenticity, one scan at a time.</p>
      </footer>
    </div>
  );
}
