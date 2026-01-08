import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const categories = [
  { name: "八字命理", slug: "bazi", description: "透過出生年月日時分析命運，了解先天命格與運勢起伏", sortOrder: 1 },
  { name: "紫微斗數", slug: "ziwei", description: "中國傳統命理學精髓，透過命盤分析人生各方面運勢", sortOrder: 2 },
  { name: "塔羅占卜", slug: "tarot", description: "西方神秘學占卜藝術，探索潛意識的訊息與指引", sortOrder: 3 },
  { name: "風水堪輿", slug: "fengshui", description: "環境能量與空間布局，助您趨吉避凶", sortOrder: 4 },
  { name: "奇門遁甲", slug: "qimen", description: "古代帝王決策之術，專業預測與布局", sortOrder: 5 },
  { name: "梅花易數", slug: "meihua", description: "象數易學占卜法，靈活應對各種問題", sortOrder: 6 },
  { name: "西洋占星", slug: "astrology", description: "星象與命運的連結，解讀星盤揭示人生藍圖", sortOrder: 7 },
  { name: "數字命理", slug: "numerology", description: "透過數字解讀命運密碼與人生課題", sortOrder: 8 },
  { name: "手相面相", slug: "palmistry", description: "透過手相面相分析性格與運勢", sortOrder: 9 },
  { name: "靈性療癒", slug: "healing", description: "能量療癒與身心平衡，協助心靈成長", sortOrder: 10 },
  { name: "冥想靜心", slug: "meditation", description: "引導冥想與靜心練習，找回內在平靜", sortOrder: 11 },
  { name: "易經卜卦", slug: "yijing", description: "運用易經智慧進行卜卦，指引人生方向", sortOrder: 12 },
];

async function seed() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  console.log("Seeding categories...");

  for (const category of categories) {
    try {
      await connection.execute(
        `INSERT INTO categories (name, slug, description, sortOrder) 
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), sortOrder = VALUES(sortOrder)`,
        [category.name, category.slug, category.description, category.sortOrder]
      );
      console.log(`✓ ${category.name}`);
    } catch (error) {
      console.error(`✗ ${category.name}:`, error.message);
    }
  }

  await connection.end();
  console.log("Done!");
}

seed().catch(console.error);
