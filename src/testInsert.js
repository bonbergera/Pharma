import { MongoClient } from 'mongodb';

async function testInsert() {
  const client = new MongoClient('mongodb://localhost:27017/'); // the actual connection string
  try {
    await client.connect();
    const db = client.db('medecine_tracking'); // the database name
    const collection = db.collection('products'); // the collection name

    const result = await collection.insertOne({
      serialNumber: 'TEST1234',
      name: 'Test Product',
      manufacturer: 'Test Manufacturer'
    });
    console.log('Inserted document ID:', result.insertedId);
  } catch (err) {
    console.error('Error inserting document:', err);
  } finally {
    await client.close();
  }
}

testInsert();