// src/app/api/products/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import type { Product } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serialNumber, name, manufacturer } = body as Partial<Product>;

    if (!serialNumber || !name || !manufacturer) {
      return NextResponse.json({ message: 'Missing required fields: serialNumber, name, and manufacturer' }, { status: 400 });
    }
    
    // Basic validation for serial number format (mirroring frontend)
    const serialNumberRegex = /^[A-Z0-9]{8,20}$/;
    if (!serialNumberRegex.test(serialNumber)) {
      return NextResponse.json({ message: 'Invalid Serial Number format. Must be 8-20 alphanumeric characters.' }, { status: 400 });
    }

    const db = await getDb();
    const productsCollection = db.collection<Product>('products');

    // Check if product with this serial number already exists
    const existingProduct = await productsCollection.findOne({ serialNumber: serialNumber.toUpperCase() });
    if (existingProduct) {
      return NextResponse.json({ message: `Product with serial number ${serialNumber} already exists.` }, { status: 409 }); // 409 Conflict
    }

    const newProduct: Product = {
      serialNumber: serialNumber.toUpperCase(), // Store in uppercase for consistent lookups
      name,
      manufacturer,
    };

    const result = await productsCollection.insertOne(newProduct);

    if (result.insertedId) {
      return NextResponse.json({ message: 'Product registered successfully', product: { ...newProduct, _id: result.insertedId } }, { status: 201 });
    } else {
      return NextResponse.json({ message: 'Failed to register product' }, { status: 500 });
    }
  } catch (error) {
    console.error('Product registration error:', error);
    if (error instanceof SyntaxError) { // Handle JSON parsing errors
        return NextResponse.json({ message: 'Invalid JSON in request body' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
    return NextResponse.json({ message: 'Method not allowed' }, { status: 405 });
}
