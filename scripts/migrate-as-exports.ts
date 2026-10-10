import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { collection, doc, getDoc, getDocs, getFirestore, setDoc } from "firebase/firestore";
import { firebaseWebConfig } from "../lib/firebase-web";

async function main() {
  const password = process.env.ADMIN_PASSWORD || "Shagun@231001";
  const app = initializeApp(firebaseWebConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  await signInWithEmailAndPassword(auth, "admin@sgcatalog.local", password);

  const settingsRef = doc(db, "sg_settings", "site");
  const settingsSnap = await getDoc(settingsRef);
  const current = settingsSnap.data() ?? {};
  const stillShagun =
    !current.businessName ||
    String(current.businessName).toLowerCase().includes("shagun");

  await setDoc(
    settingsRef,
    {
      businessName: stillShagun ? "A.S. Exports" : current.businessName,
      siteTitle:
        current.siteTitle && !String(current.siteTitle).toLowerCase().includes("shagun")
          ? current.siteTitle
          : "Product Catalogue",
      homepageHeading: current.homepageHeading || "A.S. Exports",
      homepageIntro:
        current.homepageIntro ||
        "Browse designs by collection, brand and model. Enquire on WhatsApp for sizes and availability.",
      navCatalogLabel: current.navCatalogLabel || "Catalog",
      navContactLabel: current.navContactLabel || "Contact",
      enquiryButtonLabel: current.enquiryButtonLabel || "Enquire on WhatsApp",
      watermarkEnabled: current.watermarkEnabled !== false,
      watermarkOpacity: current.watermarkOpacity ?? 0.16,
      watermarkScale: current.watermarkScale ?? 0.18,
      watermarkSpacing: current.watermarkSpacing ?? 0.08,
      watermarkRotation: current.watermarkRotation ?? -28,
      watermarkRevision: current.watermarkRevision || String(Date.now()),
      migratedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  const cats = await getDocs(collection(db, "sg_categories"));
  for (const item of cats.docs) {
    const data = item.data();
    await setDoc(
      item.ref,
      {
        parentId: data.parentId ?? null,
        kind: data.kind === "brand" || data.kind === "model" ? data.kind : "category",
        watermarkInherit: data.watermarkInherit ?? true,
        watermarkEnabled: data.watermarkEnabled ?? true,
      },
      { merge: true }
    );
  }

  const products = await getDocs(collection(db, "sg_products"));
  for (const item of products.docs) {
    const data = item.data();
    const sizes = Array.isArray(data.sizes) ? data.sizes : Array.isArray(data.tags) ? data.tags : [];
    await setDoc(
      item.ref,
      {
        name: data.designNumber || data.name || "",
        sizes,
        tags: [],
        originalCoverUrl: data.originalCoverUrl || data.coverUrl || null,
        watermarkStatus: data.watermarkStatus || "none",
      },
      { merge: true }
    );
  }

  console.log(
    `Migrated settings (${stillShagun ? "rebranded to A.S. Exports" : "kept company name"}), ${cats.size} collections, ${products.size} products.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
