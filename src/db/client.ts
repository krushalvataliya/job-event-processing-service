import { MongoClient, Db } from 'mongodb';
import { config } from '../config/index.js';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongo(customUri?: string): Promise<{ client: MongoClient; db: Db }> {
  if (client && db && !customUri) {
    return { client, db };
  }

  const uri = customUri || config.MONGO_URI;

  const newClient = new MongoClient(uri, {
    maxPoolSize: 50,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  await newClient.connect();
  const newDb = newClient.db();

  if (!customUri) {
    client = newClient;
    db = newDb;
  }

  return { client: newClient, db: newDb };
}

export function getDb(): Db {
  if (!db) {
    throw new Error('Database not initialized. Call connectMongo() first.');
  }
  return db;
}

export function getClient(): MongoClient {
  if (!client) {
    throw new Error('MongoClient not initialized. Call connectMongo() first.');
  }
  return client;
}

export async function closeMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
