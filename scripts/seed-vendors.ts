// Run with: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/seed-vendors.ts
// Or simpler: npx tsx scripts/seed-vendors.ts

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// Load env vars from .env.local
import { config } from "dotenv";
config({ path: ".env.local" });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const testVendors = [
  {
    slug: "ramsee-xerox",
    storeName: "Ramsee Xerox",
    ownerName: "Sarath Kumar",
    phone: "9944563016",
    email: "ramsee@example.com",
    address: "123, Anna Nagar Main Road, Chennai - 600040",
    themeColor: "#1a1a2e",
    isActive: true,
    createdAt: new Date().toISOString(),
    pricing: {
      bw: 1.5,
      color: 10,
      doubleSided: 2,
      a4Sheet: 1,
    },
  },
  {
    slug: "campus-prints",
    storeName: "Campus Prints",
    ownerName: "Arun Kumar",
    phone: "9876543210",
    email: "campusprints@example.com",
    address: "Near Anna University Gate, Guindy, Chennai - 600025",
    themeColor: "#0f4c75",
    isActive: true,
    createdAt: new Date().toISOString(),
    pricing: {
      bw: 1,
      color: 8,
      doubleSided: 1.5,
      a4Sheet: 1,
    },
  },
  {
    slug: "quick-copy-center",
    storeName: "Quick Copy Center",
    ownerName: "Priya Lakshmi",
    phone: "9988776655",
    email: "quickcopy@example.com",
    address: "45, T. Nagar Main Road, Chennai - 600017",
    themeColor: "#e94560",
    isActive: true,
    createdAt: new Date().toISOString(),
    pricing: {
      bw: 2,
      color: 12,
      doubleSided: 3,
      a4Sheet: 1,
    },
  },
];

async function seedVendors() {
  console.log("🌱 Seeding 3 test vendors...\n");

  for (const vendor of testVendors) {
    await setDoc(doc(db, "vendors", vendor.slug), vendor);
    console.log(`✅ Created vendor: ${vendor.storeName} (/${vendor.slug})`);
    console.log(`   QR URL: https://printeg.in/store/${vendor.slug}`);
    console.log(`   Local:  http://localhost:3000/store/${vendor.slug}\n`);
  }

  console.log("🎉 Done! All 3 test vendors have been seeded.");
  process.exit(0);
}

seedVendors().catch((err) => {
  console.error("❌ Error seeding vendors:", err);
  process.exit(1);
});
