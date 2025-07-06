// Import types for Next.js request handling
import type { NextRequest } from 'next/server';
// Import NextResponse for server responses
import { NextResponse } from 'next/server';
// Import function to connect to MongoDB
import { getDb } from '@/lib/mongodb';
// Import Product type definition
import type { Product } from '@/types';
// Import ObjectId if needed to handle MongoDB IDs (not used directly here)
import { ObjectId } from 'mongodb';

// Define the expected parameters with serialNumber as a string
interface Params {
  serialNumber: string;
}

// Asynchronous function to handle GET requests for a product by serial number
export async function GET(request: NextRequest, { params }: { params: Params }) {
  console.log(`GET /api/products/[serialNumber]: Received request for serialNumber: ${params.serialNumber}`);

  try {
    const serialNumberParam = params.serialNumber;

    // Validate that serialNumber is a non-empty string
    if (typeof serialNumberParam !== 'string' || serialNumberParam.trim() === '') {
      console.error('GET /api/products/[serialNumber]: Serial number path parameter is invalid', serialNumberParam);
      return NextResponse.json({ message: 'Serial number path parameter must be a non-empty string' }, { status: 400 });
    }

    // Connect to MongoDB and get the 'products' collection
    const db = await getDb();
    const productsCollection = db.collection<Product>('products');

    // Convert serial number to uppercase for case-insensitive search
    const upperCaseSerialNumber = serialNumberParam.toUpperCase();
    console.log(`GET /api/products/[serialNumber]: Querying for serialNumber: ${upperCaseSerialNumber}`);

    // Search for a product with the matching serial number
    const product = await productsCollection.findOne({ serialNumber: upperCaseSerialNumber });

    if (product) {
      // Convert MongoDB _id to string for JSON serialization
      const responseProduct = { ...product, _id: product._id?.toString() };
      console.log('GET /api/products/[serialNumber]: Product found:', responseProduct);
      // Return the found product with status 200
      return NextResponse.json(responseProduct, { status: 200 });
    } else {
      // Log warning if product not found
      console.warn(`GET /api/products/[serialNumber]: Product not found for serialNumber: ${upperCaseSerialNumber}`);
      // Return 404 if product does not exist
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }
  } catch (error) {
    // Log any errors that occur during processing
    console.error('GET /api/products/[serialNumber]: Product verification error:', error);
    if (error instanceof Error) {
      console.error(error.message);
    }
    // Return 500 server error for unexpected issues
    return NextResponse.json({ message: 'Internal server error during product verification' }, { status: 500 });
  }
}