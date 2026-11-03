const mongoose = require('mongoose');

async function connectMongoDB() {
  const uri = String(process.env.MONGODB_URI || '').trim();
  if (!uri) throw new Error('MONGODB_URI is required. Add your MongoDB Atlas connection string to .env.');
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise();
    return mongoose.connection;
  }
  const dbName = String(process.env.MONGODB_DB_NAME || 'computerhub_v6').trim();
  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: Number(process.env.MONGODB_TIMEOUT_MS || 12000),
    maxPoolSize: Number(process.env.MONGODB_POOL_SIZE || 10),
    autoIndex: process.env.MONGODB_AUTO_INDEX !== 'false'
  });
  console.log(`✅ MongoDB connected: ${dbName}`);
  return mongoose.connection;
}

async function disconnectMongoDB() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

module.exports = connectMongoDB;
module.exports.disconnectMongoDB = disconnectMongoDB;
