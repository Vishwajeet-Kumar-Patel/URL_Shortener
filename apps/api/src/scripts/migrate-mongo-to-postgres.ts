import mongoose from "mongoose";
import { prisma } from "../config/prisma";
import { env } from "../config/env";

async function migrate() {
  console.info("Connecting to MongoDB:", env.MONGODB_URI.replace(/([^:@]+:[^@]+@)/, "****@"));
  await mongoose.connect(env.MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB connection db is undefined");
  const collections = await db.listCollections().toArray();
  console.info(`Found ${collections.length} collections`);

  for (const collInfo of collections) {
    const name = collInfo.name;
    console.info(`Processing collection: ${name}`);
    const coll = db.collection(name);
    const cursor = coll.find();
    let count = 0;
    while (await cursor.hasNext()) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const doc = await cursor.next();
      if (!doc) continue;
      const mongoId = String(doc._id ?? "");
      // remove Mongo-specific prototype fields if any
      const docCopy = JSON.parse(JSON.stringify(doc));

      await prisma.rawDocument.create({
        data: {
          collection: name,
          mongoId,
          document: docCopy
        }
      });
      count += 1;
      if (count % 500 === 0) console.info(`Inserted ${count} documents from ${name}`);
    }
    console.info(`Finished ${name}, inserted ${count}`);
  }

  await mongoose.disconnect();
  await prisma.$disconnect();
  console.info("Migration complete");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
