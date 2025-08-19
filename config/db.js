import mongoose from 'mongoose';

export default async function connectDB() {
  const uri = process.env.MONGO_URI?.trim();
  if (!uri) {
    console.error('[DB] MONGO_URI is missing. Check your .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri); // v6+ doesn't need extra options
    const { host, port, name } = mongoose.connection;
    console.log(`[DB] Connected to MongoDB -> ${host}:${port}/${name}`);
  } catch (err) {
    console.error('[DB] Connection error:', err.message);
    process.exit(1);
  }

  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('\n[DB] Connection closed due to app termination');
    process.exit(0);
  });

  
}
