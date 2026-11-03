// Docker-only: initialize single-node replica set for MongoDB transactions.
// Safe to re-run on an already initialized rs0 replica set.
try {
  rs.status();
} catch (error) {
  if (error.codeName !== 'NotYetInitialized' && error.code !== 94) throw error;
  print('Initializing rs0 with mongodb:27017');
  rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'mongodb:27017' }] });
}
for (let i = 0; i < 90; i++) {
  try {
    if (db.adminCommand({ hello: 1 }).isWritablePrimary) {
      print('MongoDB rs0 is PRIMARY');
      quit(0);
    }
  } catch (_) {}
  sleep(1000);
}
print('MongoDB rs0 did not become primary');
quit(1);
