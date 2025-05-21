// src/app/api/products/[serialNumber]/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import type { Product } from '@/types';

interface Params {
  serialNumber: string;
}

export async function GET(request: NextRequest, { params }: { params: Params }) {
  try {
    const serialNumber = params.serialNumber;

    if (!serialNumber) {
      return NextResponse.json({ message: 'Serial number is required' }, { status: 400 });
    }

    const db = await getDb();
    const productsCollection = db.collection<Product>('products');

    // Perform case-insensitive search or assume serial numbers are stored consistently (e.g., uppercase)
    const product = await productsCollection.findOne({ serialNumber: serialNumber.toUpperCase() });

    if (product) {
      return NextResponse.json(product, { status: 200 });
    } else {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Product verification error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
