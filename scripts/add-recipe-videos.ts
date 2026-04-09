import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL, max: 1 });

const videos = [
  { id: 1, url: "https://youtu.be/gJBEWKBk1qQ" },   // Protein Oats
  { id: 2, url: "https://youtu.be/SUyROHmHK4s" },   // Chicken & Rice Bowl
  { id: 3, url: "https://youtu.be/9Dph8r7il7Y" },   // Salmon & Sweet Potato
  { id: 4, url: "https://youtu.be/BnezOB9MIQU" },   // Greek Yoghurt Parfait
  { id: 5, url: "https://youtu.be/S_O1HdS9J5E" },   // Banana Protein Smoothie
  { id: 6, url: "https://youtu.be/Fp7_l7FCRKU" },   // Lean Beef Stir Fry
  { id: 7, url: "https://youtu.be/KMrDBEjzX3g" },   // Egg White Omelette
  { id: 8, url: "https://youtu.be/n2h4fYJGMQA" },   // Tuna Salad Wrap
  { id: 9, url: "https://youtu.be/O3s1BR2WfXo" },   // Chickpea Curry
  { id: 10, url: "https://youtu.be/3AAdKl1UYZs" },  // Protein Mug Cake
];

async function main() {
  for (const v of videos) {
    const res = await pool.query(
      `UPDATE "Recipe" SET "videoUrl" = $1 WHERE id = $2 RETURNING title`,
      [v.url, v.id]
    );
    console.log(`✓ ${res.rows[0]?.title} → ${v.url}`);
  }
  console.log("\n✅ All 10 recipes now have video URLs!");
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
