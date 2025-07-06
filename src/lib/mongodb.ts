import { MongoClient, ServerApiVersion, Db } from 'mongodb';

// Check for the presence of the MongoDB URI environment variable
if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}
// Check for the presence of the database name environment variable
if (!process.env.MONGODB_DB_NAME) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_DB_NAME"');
}

// Assign environment variables to constants for reuse
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;

console.log(`Attempting to connect to MongoDB at URI: ${uri}`);
console.log(`Target database name: ${dbName}`);

// Initialize variables for MongoDB client and connection promise
let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

// Check if the environment is development
if (process.env.NODE_ENV === 'development') {
  // In development, use a global variable to cache the connection promise 
  // to preserve it across module reloads caused by HMR (Hot Module Replacement)
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  // If the global connection promise doesn't exist, create it
  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });
    console.log('Development mode: Creating new MongoDB client promise.');
    // Connect the client and store the promise in the global object
    globalWithMongo._mongoClientPromise = client.connect()
      .then(client => {
        console.log('MongoDB client connected successfully (development).');
        return client;
      })
      .catch(err => {
        console.error('Failed to connect to MongoDB (development):', err);
        throw err;
      });
  }
  // Assign the global connection promise to the variable
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production, create a new MongoClient instance directly
  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  console.log('Production mode: Creating new MongoDB client promise.');
  // Connect the client and assign the promise
  clientPromise = client.connect()
    .then(client => {
      console.log('MongoDB client connected successfully (production).');
      return client;
    })
    .catch(err => {
      console.error('Failed to connect to MongoDB (production):', err);
      throw err;
    });
}

// Function to retrieve the database instance
export async function getDb(): Promise<Db> {
  if (!clientPromise) {
    // Defensive check: should not be reached if setup is correct
    console.error("MongoDB client promise not initialized before getDb call. This indicates a setup issue.");
    throw new Error("MongoDB client promise not initialized");
  }
  try {
    const mongoClient = await clientPromise;
    return mongoClient.db(dbName);
  } catch (error) {
    // Log and rethrow errors encountered during getDb
    console.error('Error getting database instance from client promise:', error);
    throw error;
  }
}