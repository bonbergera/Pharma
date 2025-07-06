// Import types for Next.js request handling  
import type { NextRequest } from 'next/server';  
// Import NextResponse for server responses  
import { NextResponse } from 'next/server';  
// Import function to connect to MongoDB  
import { getDb } from '@/lib/mongodb';  
// Import ObjectId for handling MongoDB object IDs  
import { ObjectId } from 'mongodb';  

// Define the Product interface with optional _id property  
export interface Product {  
  serialNumber: string;  
  name: string;  
  manufacturer: string;  
  _id?: string; // Optional property to store string version of MongoDB ObjectId  
}  

// Handler for POST requests to create a new product  
export async function POST(request: NextRequest) {  
  console.log('POST /api/products: Received request');  

  try {  
    // Parse the request body as JSON  
    const body = await request.json();  
    console.log('POST /api/products: Request body:', body);  

    // Destructure required fields from the body  
    const { serialNumber, name, manufacturer } = body as Partial<Product>;  

    // Validate that required fields are present  
    if (!serialNumber || !name || !manufacturer) {  
      console.error('POST /api/products: Missing required fields');  
      return NextResponse.json({ message: 'Missing required fields: serialNumber, name, and manufacturer' }, { status: 400 });  
    }  

    // Validate serialNumber format using regex (8-20 alphanumeric uppercase)  
    const serialNumberRegex = /^[A-Z0-9]{8,20}$/;  
    if (!serialNumberRegex.test(serialNumber.toUpperCase())) {  
      console.error('POST /api/products: Invalid Serial Number format', serialNumber);  
      return NextResponse.json({ message: 'Invalid Serial Number format. Must be 8-20 alphanumeric characters.' }, { status: 400 });  
    }  

    // Connect to MongoDB  
    const db = await getDb();  
    const productsCollection = db.collection<Product>('products');  

    // Convert serial number to uppercase for consistent storage/search  
    const upperCaseSerialNumber = serialNumber.toUpperCase();  

    // Check if a product with the same serial number already exists  
    const existingProduct = await productsCollection.findOne({ serialNumber: upperCaseSerialNumber });  
    if (existingProduct) {  
      console.warn(`POST /api/products: Product with serial number ${upperCaseSerialNumber} already exists.`);  
      return NextResponse.json({ message: `Product with serial number ${upperCaseSerialNumber} already exists.` }, { status: 409 });  
    }  

    // Create a new product object without _id (MongoDB will generate it)  
    const newProductData: Omit<Product, '_id'> = {  
      serialNumber: upperCaseSerialNumber,  
      name,  
      manufacturer,  
    };  

    console.log('POST /api/products: Attempting to insert new product:', newProductData);  

    // Insert the new product into the collection  
    const result = await productsCollection.insertOne(newProductData);  
    console.log('POST /api/products: Insert result:', result);  

    // Check if the insertion was acknowledged  
    if (!result.acknowledged) {  
      console.error('POST /api/products: Insert not acknowledged by MongoDB');  
      return NextResponse.json({ message: 'Failed to insert product: operation not acknowledged' }, { status: 500 });  
    }  

    // Create the response product with verified data and string _id  
    if (result.insertedId) {  
      const createdProduct: Product = {  
        serialNumber: newProductData.serialNumber,  
        name,  
        manufacturer,  
        _id: result.insertedId.toString(),  
      };  
      console.log('POST /api/products: Product registered successfully:', createdProduct);  
      return NextResponse.json({ message: 'Product registered successfully', product: createdProduct }, { status: 201 });  
    } else {  
      console.error('POST /api/products: Failed to register product - no insertedId returned.');  
      return NextResponse.json({ message: 'Failed to register product with database' }, { status: 500 });  
    }  
  } catch (error) {  
    // Handle errors during JSON parsing or database operations  
    console.error('POST /api/products: Error during product registration:', error);  
    if (error instanceof SyntaxError) {   
      return NextResponse.json({ message: 'Invalid JSON in request body' }, { status: 400 });  
    }  
    if (error instanceof Error) {  
      console.error('Error details:', error.message, error.stack);  
    }  
    return NextResponse.json({ message: 'Internal server error during product registration' }, { status: 500 });  
  }  
}  

// Asynchronous handler for GET requests to fetch all products
export async function GET(request: NextRequest) {
  // Log receipt of the request
  console.log('GET /api/products: Received request to fetch all');

  try {
    // Connect to the database
    const db = await getDb();

    // Access the 'products' collection
    const productsCollection = db.collection<Product>('products');

    // Retrieve all products from the collection as an array
    const productsFromDb = await productsCollection.find({}).toArray();

    // Map over the products to convert ObjectId to string for each document
    const productsWithStringIds: Product[] = productsFromDb.map(p => {
      const docId = p._id;
      return {
        // Copy over serialNumber, name, manufacturer
        serialNumber: p.serialNumber,
        name: p.name,
        manufacturer: p.manufacturer,
        // Convert _id (ObjectId) to string if valid, else fallback
        _id: docId && typeof docId === 'object' && ObjectId.isValid(docId) && (docId as ObjectId).toHexString
          ? (docId as ObjectId).toHexString()
          : docId
          ? String(docId)
          : undefined,
      };
    // Filter out any products where _id couldn't be converted properly
    }).filter(p => p._id !== undefined) as Product[];

    // Log the number of products found
    console.log(`GET /api/products: Found ${productsWithStringIds.length} products.`);

    // Return the list of products as a JSON response
    return NextResponse.json(productsWithStringIds, { status: 200 });
  } catch (error) {
    // Log any errors that occur during fetch
    console.error('GET /api/products: Error fetching products:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack);
    }
    // Send a server error response
    return NextResponse.json({ message: 'Internal server error while fetching products' }, { status: 500 });
  }
}