// Run: node scripts/seed-vendors.mjs

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { readFileSync } from "fs";

// Parse .env file manually
const envContent = readFileSync(".env", "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log("Firebase project:", firebaseConfig.projectId);

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
      enableTiers: true,
      singleSideTiers: [
        { id: "1", minPages: 1, maxPages: 10, rate: 1.5 },
        { id: "2", minPages: 11, maxPages: 40, rate: 1.2 },
        { id: "3", minPages: 41, maxPages: null, rate: 1.0 },
      ],
      doubleSideTiers: [
        { id: "1", minPages: 1, maxPages: 10, rate: 2.0 },
        { id: "2", minPages: 11, maxPages: 40, rate: 1.8 },
        { id: "3", minPages: 41, maxPages: null, rate: 1.5 },
      ],
      colorTiers: [
        { id: "1", minPages: 1, maxPages: 10, rate: 10.0 },
        { id: "2", minPages: 11, maxPages: 40, rate: 8.0 },
        { id: "3", minPages: 41, maxPages: null, rate: 6.0 },
      ],
      tiers: [
        { id: "1", minPages: 1, maxPages: 10, bwRate: 1.5, doubleSidedRate: 2.0, colorRate: 10.0 },
        { id: "2", minPages: 11, maxPages: 40, bwRate: 1.2, doubleSidedRate: 1.8, colorRate: 8.0 },
        { id: "3", minPages: 41, maxPages: null, bwRate: 1.0, doubleSidedRate: 1.5, colorRate: 6.0 },
      ],
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
      enableTiers: true,
      singleSideTiers: [
        { id: "1", minPages: 1, maxPages: 10, rate: 1.0 },
        { id: "2", minPages: 11, maxPages: 40, rate: 0.8 },
        { id: "3", minPages: 41, maxPages: null, rate: 0.6 },
      ],
      doubleSideTiers: [
        { id: "1", minPages: 1, maxPages: 10, rate: 1.5 },
        { id: "2", minPages: 11, maxPages: 40, rate: 1.2 },
        { id: "3", minPages: 41, maxPages: null, rate: 1.0 },
      ],
      colorTiers: [
        { id: "1", minPages: 1, maxPages: 10, rate: 8.0 },
        { id: "2", minPages: 11, maxPages: 40, rate: 6.0 },
        { id: "3", minPages: 41, maxPages: null, rate: 5.0 },
      ],
      tiers: [
        { id: "1", minPages: 1, maxPages: 10, bwRate: 1.0, doubleSidedRate: 1.5, colorRate: 8.0 },
        { id: "2", minPages: 11, maxPages: 40, bwRate: 0.8, doubleSidedRate: 1.2, colorRate: 6.0 },
        { id: "3", minPages: 41, maxPages: null, bwRate: 0.6, doubleSidedRate: 1.0, colorRate: 5.0 },
      ],
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
      enableTiers: true,
      singleSideTiers: [
        { id: "1", minPages: 1, maxPages: 10, rate: 2.0 },
        { id: "2", minPages: 11, maxPages: 40, rate: 1.5 },
        { id: "3", minPages: 41, maxPages: null, rate: 1.2 },
      ],
      doubleSideTiers: [
        { id: "1", minPages: 1, maxPages: 10, rate: 3.0 },
        { id: "2", minPages: 11, maxPages: 40, rate: 2.5 },
        { id: "3", minPages: 41, maxPages: null, rate: 2.0 },
      ],
      colorTiers: [
        { id: "1", minPages: 1, maxPages: 10, rate: 12.0 },
        { id: "2", minPages: 11, maxPages: 40, rate: 10.0 },
        { id: "3", minPages: 41, maxPages: null, rate: 8.0 },
      ],
      tiers: [
        { id: "1", minPages: 1, maxPages: 10, bwRate: 2.0, doubleSidedRate: 3.0, colorRate: 12.0 },
        { id: "2", minPages: 11, maxPages: 40, bwRate: 1.5, doubleSidedRate: 2.5, colorRate: 10.0 },
        { id: "3", minPages: 41, maxPages: null, bwRate: 1.2, doubleSidedRate: 2.0, colorRate: 8.0 },
      ],
    },
  },
];

async function seedVendors() {
  console.log("\n🌱 Seeding 3 test vendors...\n");

  for (const vendor of testVendors) {
    await setDoc(doc(db, "vendors", vendor.slug), vendor);
    console.log(`✅ ${vendor.storeName} → /store/${vendor.slug}`);
  }

  console.log("\n🎉 Done! Test these URLs:");
  console.log("   https://printeg.in/store/ramsee-xerox");
  console.log("   https://printeg.in/store/campus-prints");
  console.log("   https://printeg.in/store/quick-copy-center\n");
  process.exit(0);
}

seedVendors().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
