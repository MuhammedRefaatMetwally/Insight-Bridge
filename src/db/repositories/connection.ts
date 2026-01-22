import pkg from 'pg';
const { Pool } = pkg;

// Create a single database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20, // Maximum connections
});

// Simple query function
export async function query(text: string, params?: any[]) {
  try {
    const result = await pool.query(text, params);
    return result.rows;
  } catch (error) {
    console.error('❌ Database query error:', error);
    throw error;
  }
}

// Test database connection
export async function testConnection() {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Close connection
export async function closeConnection() {
  await pool.end();
  console.log('Database connection closed');
}