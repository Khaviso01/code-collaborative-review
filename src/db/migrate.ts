import fs from 'fs';
import path from 'path';
import pool from '../config/db';

// Asynchronous function to execute database schema migrations
async function runMigration() {
  // Construct the absolute path to the schema.sql file relative to the current directory
  const schemaPath = path.join(__dirname, 'schema.sql');
  
  // Read the raw SQL text content synchronously from the schema file using UTF-8 encoding
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

  console.log('Running database migration...');

  try {
    // Execute the full SQL schema script; the pg driver supports running multiple semicolon-separated statements in a single query call
    await pool.query(schemaSql);
    console.log(' Migration finished successfully. All tables are ready.');
  } catch (error) {
    // Log any errors encountered during migration and set the process exit code to 1 to signal failure
    console.error(' Migration failed:', error);
    process.exitCode = 1;
  } finally {
    // Ensure the database connection pool is properly closed whether the migration succeeds or fails
    await pool.end();
  }
}

// Invoke the migration function to start the setup process
runMigration();