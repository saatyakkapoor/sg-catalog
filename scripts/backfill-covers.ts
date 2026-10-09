import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
    projectId: "unlisted-shares-india",
  });
}

const db = getFirestore();

const FALLBACK: Record<string, string> = {
  "1001": "/media/design-1001-feb752fed0b5-card.webp",
  "1002": "/media/design-1002-73d963a635a1-card.webp",
  "1015": "/media/design-1015-2365155f4928-card.webp",
  "1025": "/media/design-1025-0d1919221cb1-card.webp",
  "2004": "/media/design-2004-1c421ed24a14-card.webp",
  "2011": "/media/design-2011-126885c72a3f-card.webp",
};

async function main() {
  const [products, media] = await Promise.all([
    db.collection("sg_products").get(),
    db.collection("sg_media").get(),
  ]);
  const mediaMap = new Map(
    media.docs.map((doc) => {
      const variantsRaw = doc.data().variants;
      let variants: Record<string, string> = {};
      try {
        variants =
          typeof variantsRaw === "string"
            ? (JSON.parse(variantsRaw) as Record<string, string>)
            : (variantsRaw as Record<string, string>) || {};
      } catch {
        variants = {};
      }
      return [doc.id, variants.card || variants.detail || variants.thumb || ""] as const;
    })
  );

  for (const doc of products.docs) {
    const data = doc.data();
    if (typeof data.coverUrl === "string" && data.coverUrl.length > 0) continue;
    const ids = Array.isArray(data.imageIds) ? data.imageIds : [];
    const fromMedia = ids.map((id: string) => mediaMap.get(id)).find(Boolean);
    const coverUrl = fromMedia || FALLBACK[String(data.designNumber)] || null;
    if (!coverUrl) {
      console.log("skip", data.designNumber, data.name);
      continue;
    }
    await doc.ref.set({ coverUrl }, { merge: true });
    console.log("cover", data.designNumber, coverUrl.slice(0, 40));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
