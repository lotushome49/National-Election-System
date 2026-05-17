import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

export let db: any = null;
export let isConnected = false;

try {
  if (process.env.DATABASE_URL) {
    const poolConnection = mysql.createPool(process.env.DATABASE_URL);
    db = drizzle(poolConnection, { schema, mode: 'default' });
    isConnected = true;
    console.log('✅ Connected to MySQL Database successfully.');
  } else {
    console.warn("⚠️ DATABASE_URL not set in environment. MySQL Database won't be connected.");
  }
} catch (e) {
  console.error('❌ Failed to connect to MySQL Database:', e);
}
