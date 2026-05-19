import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // --- Admin ---
  const admin = await prisma.admin.upsert({
    where: { email: "admin@deepexperience.jp" },
    update: {},
    create: {
      email: "admin@deepexperience.jp",
      passwordHash: hashSync("admin123", 10),
      name: "運営管理者",
    },
  });
  console.log(`Admin created: ${admin.email}`);

  // --- Guides ---
  const guide1 = await prisma.guide.upsert({
    where: { email: "tanaka@example.com" },
    update: {},
    create: {
      email: "tanaka@example.com",
      passwordHash: hashSync("guide123", 10),
      name: "田中太郎",
      bio: "浅草で10年以上ガイドをしています。歴史と食べ歩きが得意です。",
      languages: JSON.stringify(["ja", "en"]),
      areas: JSON.stringify(["asakusa", "ueno", "akihabara"]),
    },
  });

  const guide2 = await prisma.guide.upsert({
    where: { email: "sato@example.com" },
    update: {},
    create: {
      email: "sato@example.com",
      passwordHash: hashSync("guide123", 10),
      name: "佐藤花子",
      bio: "渋谷・原宿エリアのカルチャーツアーを専門にしています。",
      languages: JSON.stringify(["ja", "en", "zh"]),
      areas: JSON.stringify(["shibuya", "harajuku", "shinjuku"]),
    },
  });
  console.log(`Guides created: ${guide1.name}, ${guide2.name}`);

  // --- Tours ---
  const tour1 = await prisma.tour.create({
    data: {
      title: "浅草寺周辺散策ツアー",
      titleEn: "Sensoji Temple Walking Tour",
      description:
        "雷門から浅草寺、仲見世通りを巡る定番ツアー。地元ガイドが歴史や文化を楽しく紹介します。",
      descriptionEn:
        "A classic walking tour from Kaminarimon to Sensoji Temple and Nakamise Street. A local guide will introduce the history and culture in a fun way.",
      imageUrls: JSON.stringify([
        "https://images.unsplash.com/photo-1578882552069-3c4478fc5fc6?w=800&h=600&fit=crop",
      ]),
      meetingPointLat: 35.7112,
      meetingPointLng: 139.7963,
      meetingPointName: "雷門前",
      durationMinutes: 120,
      pricePerPersonCents: 3000,
      maxParticipants: 8,
      tourType: "GROUP",
      category: "歴史・文化",
    },
  });

  const tour2 = await prisma.tour.create({
    data: {
      title: "築地・豊洲 食べ歩きツアー",
      titleEn: "Tsukiji & Toyosu Food Tour",
      description:
        "築地場外市場と豊洲の美味しいグルメスポットを巡ります。新鮮な海鮮や和菓子を楽しめます。",
      descriptionEn:
        "Explore the delicious food spots of Tsukiji Outer Market and Toyosu. Enjoy fresh seafood and Japanese sweets.",
      imageUrls: JSON.stringify([
        "https://images.unsplash.com/photo-1490052048947-f6d652c8512a?w=800&h=600&fit=crop",
      ]),
      meetingPointLat: 35.6654,
      meetingPointLng: 139.7707,
      meetingPointName: "築地場外市場 入口",
      durationMinutes: 150,
      pricePerPersonCents: 5000,
      maxParticipants: 6,
      tourType: "GROUP",
      category: "食べ歩き",
    },
  });

  const tour3 = await prisma.tour.create({
    data: {
      title: "渋谷カルチャーツアー",
      titleEn: "Shibuya Culture Tour",
      description:
        "渋谷のストリートカルチャー、ファッション、音楽シーンを地元ガイドと一緒に体験します。",
      descriptionEn:
        "Experience Shibuya's street culture, fashion, and music scene with a local guide.",
      imageUrls: JSON.stringify([
        "https://images.unsplash.com/photo-1741225296006-4b14e09a6bc6?w=800&h=600&fit=crop",
      ]),
      meetingPointLat: 35.6595,
      meetingPointLng: 139.7004,
      meetingPointName: "渋谷ハチ公前",
      durationMinutes: 90,
      pricePerPersonCents: 4000,
      maxParticipants: 10,
      tourType: "GROUP",
      category: "カルチャー",
    },
  });

  const tour4 = await prisma.tour.create({
    data: {
      title: "プライベート東京カスタムツアー",
      titleEn: "Private Custom Tokyo Tour",
      description:
        "お客様のご要望に合わせた完全プライベートツアー。行きたい場所、見たいものをお伝えください。",
      descriptionEn:
        "A fully private tour tailored to your preferences. Tell us where you want to go and what you want to see.",
      imageUrls: JSON.stringify([
        "https://images.unsplash.com/photo-1741920852881-5284c70305bd?w=800&h=600&fit=crop",
      ]),
      meetingPointLat: 35.6812,
      meetingPointLng: 139.7671,
      meetingPointName: "東京駅 丸の内南口",
      durationMinutes: 180,
      pricePerPersonCents: 8000,
      maxParticipants: 1,
      tourType: "PRIVATE",
      category: "プライベート",
    },
  });
  // --- More Tours (Tokyo Station area) ---
  const tour5 = await prisma.tour.create({
    data: {
      title: "皇居一周ウォーキングツアー",
      titleEn: "Imperial Palace Loop Walking Tour",
      description:
        "皇居の外周を一周しながら、江戸城の歴史と東京の近代建築を楽しむツアー。二重橋や大手門など見どころ満載。",
      descriptionEn:
        "Walk around the Imperial Palace while learning about Edo Castle history and modern Tokyo architecture. Highlights include Nijubashi Bridge and Otemon Gate.",
      imageUrls: JSON.stringify([
        "https://images.unsplash.com/photo-1582229817369-ba3cf267b608?w=800&h=600&fit=crop",
      ]),
      meetingPointLat: 35.6825,
      meetingPointLng: 139.7628,
      meetingPointName: "皇居外苑 楠木正成像前",
      durationMinutes: 90,
      pricePerPersonCents: 2500,
      maxParticipants: 12,
      tourType: "GROUP",
      category: "歴史・文化",
    },
  });

  const tour6 = await prisma.tour.create({
    data: {
      title: "丸の内・銀座グルメツアー",
      titleEn: "Marunouchi & Ginza Gourmet Tour",
      description:
        "東京駅周辺から銀座エリアを巡り、老舗の和菓子店やモダンなカフェ、デパ地下グルメを堪能します。",
      descriptionEn:
        "Explore gourmet spots from Tokyo Station to Ginza. Visit traditional Japanese sweet shops, modern cafes, and department store food halls.",
      imageUrls: JSON.stringify([
        "https://images.unsplash.com/photo-1755498476260-55af74a359a7?w=800&h=600&fit=crop",
      ]),
      meetingPointLat: 35.6812,
      meetingPointLng: 139.7671,
      meetingPointName: "東京駅 丸の内南口",
      durationMinutes: 120,
      pricePerPersonCents: 4500,
      maxParticipants: 6,
      tourType: "GROUP",
      category: "食べ歩き",
    },
  });

  const tour7 = await prisma.tour.create({
    data: {
      title: "日本橋 老舗めぐりツアー",
      titleEn: "Nihonbashi Heritage Shop Tour",
      description:
        "日本橋エリアの老舗を巡るツアー。創業100年以上の老舗が並ぶ街で、日本の伝統文化を体験します。",
      descriptionEn:
        "Discover century-old shops in the Nihonbashi district. Experience traditional Japanese culture through shops with over 100 years of history.",
      imageUrls: JSON.stringify([
        "https://images.unsplash.com/photo-1488982861479-0b1597a86175?w=800&h=600&fit=crop",
      ]),
      meetingPointLat: 35.6839,
      meetingPointLng: 139.7744,
      meetingPointName: "日本橋 麒麟像前",
      durationMinutes: 100,
      pricePerPersonCents: 3500,
      maxParticipants: 8,
      tourType: "GROUP",
      category: "歴史・文化",
    },
  });

  const tour8 = await prisma.tour.create({
    data: {
      title: "東京駅建築ツアー",
      titleEn: "Tokyo Station Architecture Tour",
      description:
        "復元された東京駅丸の内駅舎の建築美を堪能。レンガ造りの駅舎から周辺の近代建築まで、建築の歴史を解説します。",
      descriptionEn:
        "Admire the restored Marunouchi Station Building. From the iconic brick facade to surrounding modern architecture, explore Tokyo's architectural history.",
      imageUrls: JSON.stringify([
        "https://images.unsplash.com/photo-1589085947283-29350e580893?w=800&h=600&fit=crop",
      ]),
      meetingPointLat: 35.6812,
      meetingPointLng: 139.7671,
      meetingPointName: "東京駅 丸の内中央口",
      durationMinutes: 75,
      pricePerPersonCents: 2000,
      maxParticipants: 10,
      tourType: "GROUP",
      category: "建築",
    },
  });

  const tour9 = await prisma.tour.create({
    data: {
      title: "秋葉原オタクカルチャーツアー",
      titleEn: "Akihabara Otaku Culture Tour",
      description:
        "秋葉原の電気街とオタクカルチャーを案内。アニメショップ、メイドカフェ、レトロゲーム店を巡ります。",
      descriptionEn:
        "Explore Akihabara's electric town and otaku culture. Visit anime shops, maid cafes, and retro game stores.",
      imageUrls: JSON.stringify([
        "https://images.unsplash.com/photo-1562221421-da28605eba10?w=800&h=600&fit=crop",
      ]),
      meetingPointLat: 35.6984,
      meetingPointLng: 139.7731,
      meetingPointName: "秋葉原駅 電気街口",
      durationMinutes: 120,
      pricePerPersonCents: 3500,
      maxParticipants: 8,
      tourType: "GROUP",
      category: "カルチャー",
    },
  });

  const tour10 = await prisma.tour.create({
    data: {
      title: "プライベート皇居・丸の内ツアー",
      titleEn: "Private Imperial Palace & Marunouchi Tour",
      description:
        "皇居東御苑と丸の内エリアをプライベートガイドと巡るツアー。お客様のペースでゆっくり楽しめます。",
      descriptionEn:
        "A private guided tour of the Imperial Palace East Gardens and Marunouchi area. Enjoy at your own pace with a dedicated guide.",
      imageUrls: JSON.stringify([
        "https://images.unsplash.com/photo-1548148870-adbf75452257?w=800&h=600&fit=crop",
      ]),
      meetingPointLat: 35.6852,
      meetingPointLng: 139.7606,
      meetingPointName: "大手門",
      durationMinutes: 150,
      pricePerPersonCents: 10000,
      maxParticipants: 1,
      tourType: "PRIVATE",
      category: "プライベート",
    },
  });

  // --- Tours (Shinjuku / West Tokyo) ---
  const tour11 = await prisma.tour.create({
    data: {
      title: "新宿ゴールデン街ナイトツアー",
      titleEn: "Shinjuku Golden Gai Night Tour",
      description: "200軒以上の小さなバーが並ぶゴールデン街を地元ガイドと巡る夜のツアー。",
      descriptionEn: "Explore Golden Gai's 200+ tiny bars with a local guide on this evening tour.",
      imageUrls: JSON.stringify(["https://images.unsplash.com/photo-1554797589-7241bb691973?w=800&h=600&fit=crop"]),
      meetingPointLat: 35.6938, meetingPointLng: 139.7036, meetingPointName: "新宿三丁目駅 E1出口",
      durationMinutes: 120, pricePerPersonCents: 5000, maxParticipants: 6, tourType: "GROUP", category: "ナイトライフ",
    },
  });

  const tour12 = await prisma.tour.create({
    data: {
      title: "新宿御苑 四季の庭園ツアー",
      titleEn: "Shinjuku Gyoen Garden Tour",
      description: "広大な新宿御苑で日本庭園・フランス式庭園・イギリス風景式庭園を巡ります。",
      descriptionEn: "Explore the vast Shinjuku Gyoen with Japanese, French, and English landscape gardens.",
      imageUrls: JSON.stringify(["https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop"]),
      meetingPointLat: 35.6852, meetingPointLng: 139.7100, meetingPointName: "新宿御苑 新宿門",
      durationMinutes: 90, pricePerPersonCents: 2500, maxParticipants: 10, tourType: "GROUP", category: "自然・庭園",
    },
  });

  const tour13 = await prisma.tour.create({
    data: {
      title: "原宿・表参道ファッションツアー",
      titleEn: "Harajuku & Omotesando Fashion Tour",
      description: "竹下通りから表参道まで、東京のファッション最前線を歩くツアー。",
      descriptionEn: "Walk through Tokyo's fashion frontier from Takeshita Street to Omotesando.",
      imageUrls: JSON.stringify(["https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=800&h=600&fit=crop"]),
      meetingPointLat: 35.6702, meetingPointLng: 139.7026, meetingPointName: "原宿駅 竹下口",
      durationMinutes: 100, pricePerPersonCents: 3500, maxParticipants: 8, tourType: "GROUP", category: "カルチャー",
    },
  });

  const tour14 = await prisma.tour.create({
    data: {
      title: "下北沢サブカルチャーツアー",
      titleEn: "Shimokitazawa Subculture Tour",
      description: "古着、ライブハウス、小劇場が集まる下北沢のサブカルチャーシーンを体験。",
      descriptionEn: "Experience Shimokitazawa's subculture scene with vintage shops, live houses, and small theaters.",
      imageUrls: JSON.stringify(["https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800&h=600&fit=crop"]),
      meetingPointLat: 35.6613, meetingPointLng: 139.6680, meetingPointName: "下北沢駅 南口",
      durationMinutes: 90, pricePerPersonCents: 3000, maxParticipants: 8, tourType: "GROUP", category: "カルチャー",
    },
  });

  // --- Tours (Osaka) ---
  const tour15 = await prisma.tour.create({
    data: {
      title: "道頓堀グルメツアー",
      titleEn: "Dotonbori Street Food Tour",
      description: "大阪名物のたこ焼き・お好み焼き・串カツを食べ歩く道頓堀ツアー。グリコ看板前で記念撮影も。",
      descriptionEn: "Eat your way through Dotonbori with takoyaki, okonomiyaki, and kushikatsu. Photo op at the iconic Glico sign.",
      imageUrls: JSON.stringify(["https://images.unsplash.com/photo-1590559899731-a382839e5549?w=800&h=600&fit=crop"]),
      meetingPointLat: 34.6687, meetingPointLng: 135.5013, meetingPointName: "なんば駅 14番出口",
      durationMinutes: 150, pricePerPersonCents: 4500, maxParticipants: 8, tourType: "GROUP", category: "食べ歩き",
    },
  });

  const tour16 = await prisma.tour.create({
    data: {
      title: "大阪城 歴史探訪ツアー",
      titleEn: "Osaka Castle History Tour",
      description: "天守閣と広大な城郭公園を巡りながら、豊臣秀吉の時代から現代までの歴史を学びます。",
      descriptionEn: "Explore the castle tower and vast park while learning history from Toyotomi Hideyoshi's era to modern times.",
      imageUrls: JSON.stringify(["https://images.unsplash.com/photo-1589452271712-64b8a66c3621?w=800&h=600&fit=crop"]),
      meetingPointLat: 34.6873, meetingPointLng: 135.5262, meetingPointName: "大阪城公園駅 改札前",
      durationMinutes: 120, pricePerPersonCents: 3000, maxParticipants: 10, tourType: "GROUP", category: "歴史・文化",
    },
  });

  const tour17 = await prisma.tour.create({
    data: {
      title: "新世界・通天閣ディープ大阪ツアー",
      titleEn: "Shinsekai & Tsutenkaku Deep Osaka Tour",
      description: "レトロな雰囲気の新世界エリアを歩き、通天閣からの展望と串カツを楽しむツアー。",
      descriptionEn: "Walk through the retro Shinsekai area, enjoy views from Tsutenkaku Tower and taste kushikatsu.",
      imageUrls: JSON.stringify(["https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=800&h=600&fit=crop"]),
      meetingPointLat: 34.6525, meetingPointLng: 135.5063, meetingPointName: "動物園前駅 1番出口",
      durationMinutes: 100, pricePerPersonCents: 3500, maxParticipants: 8, tourType: "GROUP", category: "カルチャー",
    },
  });

  // --- Tours (Kyoto) ---
  const tour18 = await prisma.tour.create({
    data: {
      title: "伏見稲荷 千本鳥居ツアー",
      titleEn: "Fushimi Inari Thousand Torii Gates Tour",
      description: "朱色の千本鳥居をくぐりながら稲荷山を巡るツアー。早朝出発で混雑を避けます。",
      descriptionEn: "Walk through the vermillion thousand torii gates of Inari mountain. Early departure to avoid crowds.",
      imageUrls: JSON.stringify(["https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=800&h=600&fit=crop"]),
      meetingPointLat: 34.9671, meetingPointLng: 135.7727, meetingPointName: "伏見稲荷駅 改札前",
      durationMinutes: 120, pricePerPersonCents: 3500, maxParticipants: 8, tourType: "GROUP", category: "歴史・文化",
    },
  });

  const tour19 = await prisma.tour.create({
    data: {
      title: "嵐山・竹林の小径ツアー",
      titleEn: "Arashiyama Bamboo Grove Tour",
      description: "嵐山の竹林の小径、天龍寺、渡月橋を巡る京都西部の定番ツアー。",
      descriptionEn: "Visit the Bamboo Grove, Tenryuji Temple, and Togetsukyo Bridge in western Kyoto.",
      imageUrls: JSON.stringify(["https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800&h=600&fit=crop"]),
      meetingPointLat: 35.0094, meetingPointLng: 135.6737, meetingPointName: "嵐山駅（嵐電）前",
      durationMinutes: 150, pricePerPersonCents: 4000, maxParticipants: 8, tourType: "GROUP", category: "自然・庭園",
    },
  });

  const tour20 = await prisma.tour.create({
    data: {
      title: "祇園・花見小路 舞妓体験ツアー",
      titleEn: "Gion & Hanamikoji Geisha District Tour",
      description: "祇園の花見小路を歩き、茶屋建築や舞妓文化について学ぶツアー。運が良ければ舞妓さんに出会えるかも。",
      descriptionEn: "Walk through Gion's Hanamikoji Street and learn about machiya architecture and maiko culture.",
      imageUrls: JSON.stringify(["https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&h=600&fit=crop"]),
      meetingPointLat: 35.0037, meetingPointLng: 135.7756, meetingPointName: "祇園四条駅 7番出口",
      durationMinutes: 100, pricePerPersonCents: 4500, maxParticipants: 6, tourType: "GROUP", category: "歴史・文化",
    },
  });

  const allTours = [tour1, tour2, tour3, tour4, tour5, tour6, tour7, tour8, tour9, tour10,
    tour11, tour12, tour13, tour14, tour15, tour16, tour17, tour18, tour19, tour20];
  console.log(`Tours created: ${allTours.length} tours`);

  // Issue #1: inventory & booking policy defaults for all seeded tours
  await prisma.tour.updateMany({
    data: {
      dailyCapacity: 40,
      maxDeparturesPerDay: 5,
      bookingCutoffMinutes: 120,
      freeCancellationDeadlineHours: 24,
    },
  });
  console.log("Inventory defaults applied to all tours");

  // --- Spots (施設) ---
  const spot1 = await prisma.spot.create({
    data: {
      name: "浅草寺", nameEn: "Sensoji Temple",
      description: "東京最古の寺院。雷門と仲見世通りで有名。",
      descriptionEn: "Tokyo's oldest temple, famous for Kaminarimon Gate and Nakamise Street.",
      imageUrls: JSON.stringify(["https://images.unsplash.com/photo-1578882552069-3c4478fc5fc6?w=800&h=600&fit=crop"]),
      lat: 35.7148, lng: 139.7967, locationName: "東京都台東区浅草2-3-1",
      category: "寺社仏閣",
    },
  });
  const spot2 = await prisma.spot.create({
    data: {
      name: "築地場外市場", nameEn: "Tsukiji Outer Market",
      description: "新鮮な海産物や食材が集まる東京を代表する市場。",
      descriptionEn: "Tokyo's iconic market featuring fresh seafood and ingredients.",
      imageUrls: JSON.stringify(["https://images.unsplash.com/photo-1490052048947-f6d652c8512a?w=800&h=600&fit=crop"]),
      lat: 35.6654, lng: 139.7707, locationName: "東京都中央区築地4丁目",
      category: "市場・商店街",
    },
  });
  const spot3 = await prisma.spot.create({
    data: {
      name: "渋谷スクランブル交差点", nameEn: "Shibuya Scramble Crossing",
      description: "世界で最も有名な交差点の一つ。",
      descriptionEn: "One of the world's most famous pedestrian crossings.",
      imageUrls: JSON.stringify(["https://images.unsplash.com/photo-1741225296006-4b14e09a6bc6?w=800&h=600&fit=crop"]),
      lat: 35.6595, lng: 139.7004, locationName: "東京都渋谷区道玄坂2丁目",
      category: "ランドマーク",
    },
  });
  const spot4 = await prisma.spot.create({
    data: {
      name: "皇居", nameEn: "Imperial Palace",
      description: "天皇の住居。広大な庭園と歴史的建造物。",
      descriptionEn: "The primary residence of the Emperor of Japan, featuring vast gardens and historic structures.",
      imageUrls: JSON.stringify(["https://images.unsplash.com/photo-1582229817369-ba3cf267b608?w=800&h=600&fit=crop"]),
      lat: 35.6852, lng: 139.7528, locationName: "東京都千代田区千代田1-1",
      category: "歴史・名所",
    },
  });
  const spot5 = await prisma.spot.create({
    data: {
      name: "東京駅", nameEn: "Tokyo Station",
      description: "1914年開業の赤レンガ駅舎。復元された丸の内駅舎は国の重要文化財。",
      descriptionEn: "Opened in 1914, the red-brick Marunouchi Station Building is a nationally designated Important Cultural Property.",
      imageUrls: JSON.stringify(["https://images.unsplash.com/photo-1589085947283-29350e580893?w=800&h=600&fit=crop"]),
      lat: 35.6812, lng: 139.7671, locationName: "東京都千代田区丸の内1丁目",
      category: "建築・ランドマーク",
    },
  });
  const spot6 = await prisma.spot.create({
    data: {
      name: "秋葉原", nameEn: "Akihabara",
      description: "電気街とオタクカルチャーの聖地。アニメ・ゲーム・電子機器の街。",
      descriptionEn: "The holy land of electronics and otaku culture. A district known for anime, games, and electronics.",
      imageUrls: JSON.stringify(["https://images.unsplash.com/photo-1562221421-da28605eba10?w=800&h=600&fit=crop"]),
      lat: 35.6984, lng: 139.7731, locationName: "東京都千代田区外神田",
      category: "カルチャー",
    },
  });
  const spot7 = await prisma.spot.create({
    data: {
      name: "日本橋", nameEn: "Nihonbashi",
      description: "江戸時代から続く商業の中心地。老舗が集まる歴史的エリア。",
      descriptionEn: "A historic commercial center dating back to the Edo period, home to many century-old shops.",
      imageUrls: JSON.stringify(["https://images.unsplash.com/photo-1488982861479-0b1597a86175?w=800&h=600&fit=crop"]),
      lat: 35.6839, lng: 139.7744, locationName: "東京都中央区日本橋",
      category: "歴史・商業",
    },
  });
  console.log(`Spots created: 7 spots`);

  // Link tours to spots + populate all content fields
  await prisma.tour.update({ where: { id: tour1.id }, data: {
    spotId: spot1.id, area: "台東区", areaDetail: "浅草",
    imageUrls: JSON.stringify([
      "https://images.unsplash.com/photo-1578882552069-3c4478fc5fc6?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1583766395091-2eb9994ed094?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1570459027562-4a916cc6113f?w=800&h=600&fit=crop",
    ]),
    cancellationPolicy: "3日前まで無料キャンセル可。前日50%、当日100%。",
    paymentMethod: "ON_SITE",
    supportedLanguages: JSON.stringify(["ja", "en"]),
    tags: JSON.stringify(["歴史", "寺社仏閣", "散策", "初心者向け"]),
    highlightsJa: "雷門の大提灯での記念撮影\n仲見世通りで伝統的なお土産や和菓子を堪能\n浅草寺本堂の荘厳な建築美\n五重塔と周辺の庭園散策",
    highlightsEn: "Photo opportunity at the iconic Kaminarimon lantern\nTraditional souvenirs and sweets along Nakamise Street\nMajestic architecture of Sensoji main hall\nFive-story pagoda and surrounding garden walk",
    inclusionsJa: "ガイド料\nおみくじ体験（1回）\n仲見世通りでの試食1品",
    inclusionsEn: "Guide fee\nOmikuji (fortune slip) experience (once)\nOne tasting item on Nakamise Street",
    importantNotesJa: "歩きやすい靴でお越しください。\n雨天決行（荒天時は中止）。\n寺院内では帽子を脱いでください。",
    importantNotesEn: "Please wear comfortable walking shoes.\nTour runs in light rain (cancelled in severe weather).\nPlease remove hats inside the temple.",
    bookingNotesJa: "集合場所は雷門の大提灯の下です。\nガイドは「DEEP Experience」のプレートを持っています。",
    bookingNotesEn: "Meeting point is under the large lantern at Kaminarimon Gate.\nGuide will hold a 'DEEP Experience' sign.",
    meetingPointDescJa: "雷門（風雷神門）の大提灯の真下。地下鉄銀座線 浅草駅 1番出口から徒歩1分。",
    meetingPointDescEn: "Directly under the large lantern at Kaminarimon (Thunder Gate). 1 min walk from Asakusa Station Exit 1 (Ginza Line).",
    accessInfoJa: "東京メトロ銀座線 浅草駅 1番出口 徒歩1分\n都営浅草線 浅草駅 A4出口 徒歩2分\nつくばエクスプレス 浅草駅 A1出口 徒歩5分",
    accessInfoEn: "Tokyo Metro Ginza Line, Asakusa Station Exit 1 (1 min walk)\nToei Asakusa Line, Asakusa Station Exit A4 (2 min walk)\nTsukuba Express, Asakusa Station Exit A1 (5 min walk)",
  }});
  await prisma.tour.update({ where: { id: tour2.id }, data: {
    spotId: spot2.id, area: "中央区", areaDetail: "築地・豊洲",
    imageUrls: JSON.stringify([
      "https://images.unsplash.com/photo-1490052048947-f6d652c8512a?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1553621042-f6e147245754?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&h=600&fit=crop",
    ]),
    cancellationPolicy: "2日前まで無料キャンセル可。前日50%、当日100%。",
    paymentMethod: "ON_SITE",
    supportedLanguages: JSON.stringify(["ja", "en"]),
    tags: JSON.stringify(["グルメ", "市場", "海鮮", "食べ歩き"]),
    highlightsJa: "築地場外市場で新鮮な海鮮丼や寿司を試食\n玉子焼きの老舗で焼きたてを味わう\nマグロの解体を間近で見学（タイミングによる）\n豊洲市場周辺の最新グルメスポット",
    highlightsEn: "Fresh sashimi and sushi tasting at Tsukiji Outer Market\nFreshly made tamagoyaki at a century-old shop\nWatch tuna cutting demonstration (timing dependent)\nLatest gourmet spots around Toyosu Market",
    inclusionsJa: "ガイド料\n試食5品（海鮮、玉子焼き、和菓子など）\nお茶1杯",
    inclusionsEn: "Guide fee\n5 tasting items (seafood, tamagoyaki, Japanese sweets, etc.)\nOne cup of tea",
    importantNotesJa: "食物アレルギーがある場合は事前にお知らせください。\n市場は早朝が活気があります。\n混雑時は移動にお時間がかかる場合があります。",
    importantNotesEn: "Please inform us of any food allergies in advance.\nThe market is most lively in the early morning.\nTravel time may be longer during peak hours.",
    bookingNotesJa: "集合場所は築地場外市場の正門入口です。",
    bookingNotesEn: "Meeting point is at the main entrance of Tsukiji Outer Market.",
    meetingPointDescJa: "築地場外市場の正門（晴海通り側）入口前。地下鉄日比谷線 築地駅 1番出口から徒歩3分。",
    meetingPointDescEn: "In front of the main gate (Harumi-dori side) of Tsukiji Outer Market. 3 min walk from Tsukiji Station Exit 1 (Hibiya Line).",
    accessInfoJa: "東京メトロ日比谷線 築地駅 1番出口 徒歩3分\n都営大江戸線 築地市場駅 A1出口 徒歩5分",
    accessInfoEn: "Tokyo Metro Hibiya Line, Tsukiji Station Exit 1 (3 min walk)\nToei Oedo Line, Tsukijishijo Station Exit A1 (5 min walk)",
  }});
  await prisma.tour.update({ where: { id: tour3.id }, data: {
    spotId: spot3.id, area: "渋谷区", areaDetail: "渋谷・原宿",
    imageUrls: JSON.stringify([
      "https://images.unsplash.com/photo-1741225296006-4b14e09a6bc6?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1532236204992-f5e82c553945?w=800&h=600&fit=crop",
    ]),
    cancellationPolicy: "前日まで無料キャンセル可。当日100%。",
    paymentMethod: "ON_SITE",
    supportedLanguages: JSON.stringify(["ja", "en"]),
    tags: JSON.stringify(["カルチャー", "ファッション", "若者文化", "フォトジェニック"]),
    highlightsJa: "スクランブル交差点を上から撮影できるスポット案内\n裏渋谷のストリートアートめぐり\n原宿の最新トレンドショップ\nカワイイカルチャーの発信地を体験",
    highlightsEn: "Bird's-eye view photo spot of Scramble Crossing\nStreet art tour in Ura-Shibuya\nLatest trend shops in Harajuku\nExperience the birthplace of Kawaii culture",
    inclusionsJa: "ガイド料\nクレープ1品（原宿にて）",
    inclusionsEn: "Guide fee\nOne crepe in Harajuku",
    importantNotesJa: "歩く距離が多めです（約3km）。\n写真撮影スポットが多いのでカメラをお忘れなく。",
    importantNotesEn: "Moderate walking distance (approx. 3km).\nMany photo spots — don't forget your camera.",
    bookingNotesJa: "ハチ公像前で集合です。ガイドが目印のプレートを持っています。",
    bookingNotesEn: "Meet at the Hachiko statue. Guide will hold an identification sign.",
    meetingPointDescJa: "JR渋谷駅 ハチ公口を出て正面のハチ公像前。",
    meetingPointDescEn: "In front of Hachiko statue, outside JR Shibuya Station Hachiko Exit.",
    accessInfoJa: "JR山手線 渋谷駅 ハチ公口 徒歩1分\n東京メトロ各線 渋谷駅 B6出口 徒歩2分",
    accessInfoEn: "JR Yamanote Line, Shibuya Station Hachiko Exit (1 min walk)\nTokyo Metro, Shibuya Station Exit B6 (2 min walk)",
  }});
  await prisma.tour.update({ where: { id: tour4.id }, data: {
    spotId: spot5.id, area: "千代田区", areaDetail: "丸の内",
    imageUrls: JSON.stringify([
      "https://images.unsplash.com/photo-1741920852881-5284c70305bd?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop",
    ]),
    cancellationPolicy: "5日前まで無料キャンセル可。3日前50%、前日以降100%。",
    paymentMethod: "ONLINE",
    supportedLanguages: JSON.stringify(["ja", "en"]),
    tags: JSON.stringify(["プライベート", "カスタム", "VIP", "貸切"]),
    highlightsJa: "お客様だけの完全プライベートツアー\n行きたい場所をカスタマイズ可能\n東京の隠れた名所もご案内\nレストラン予約の代行も対応",
    highlightsEn: "Fully private tour just for you\nCustomizable destinations\nHidden gems of Tokyo\nRestaurant reservation assistance available",
    inclusionsJa: "プライベートガイド料\n公共交通機関のチケット（1日券）\nミネラルウォーター",
    inclusionsEn: "Private guide fee\nPublic transportation day pass\nMineral water",
    importantNotesJa: "行程はお客様のご要望に応じて柔軟に変更可能です。\n事前にご希望をお伝えいただくとよりスムーズです。",
    importantNotesEn: "Itinerary is flexible based on your preferences.\nSharing your wishes in advance helps us plan better.",
    bookingNotesJa: "ご予約後、ガイドから直接ご連絡いたします。",
    bookingNotesEn: "After booking, the guide will contact you directly.",
    meetingPointDescJa: "東京駅 丸の内南口の改札を出たところ。",
    meetingPointDescEn: "Outside the ticket gates at Tokyo Station Marunouchi South Exit.",
    accessInfoJa: "JR各線 東京駅 丸の内南口 直結\n東京メトロ丸ノ内線 東京駅 直結",
    accessInfoEn: "JR Lines, Tokyo Station Marunouchi South Exit (direct)\nTokyo Metro Marunouchi Line, Tokyo Station (direct)",
  }});
  await prisma.tour.update({ where: { id: tour5.id }, data: {
    spotId: spot4.id, area: "千代田区", areaDetail: "皇居周辺",
    imageUrls: JSON.stringify([
      "https://images.unsplash.com/photo-1582229817369-ba3cf267b608?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1548148870-adbf75452257?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1551641506-ee5bf4cb45f1?w=800&h=600&fit=crop",
    ]),
    cancellationPolicy: "前日まで無料キャンセル可。当日100%。",
    paymentMethod: "ON_SITE",
    supportedLanguages: JSON.stringify(["ja", "en"]),
    tags: JSON.stringify(["歴史", "皇居", "ウォーキング", "建築"]),
    highlightsJa: "二重橋と伏見櫓の絶景ポイント\n大手門から皇居東御苑を散策\n江戸城の石垣と天守台跡\n丸の内の近代建築群との対比",
    highlightsEn: "Scenic Nijubashi Bridge and Fushimi Turret\nStroll through East Gardens via Otemon Gate\nEdo Castle stone walls and castle tower ruins\nContrast with modern Marunouchi architecture",
    inclusionsJa: "ガイド料\n皇居東御苑入園（無料）",
    inclusionsEn: "Guide fee\nImperial Palace East Gardens admission (free)",
    importantNotesJa: "月曜・金曜は皇居東御苑が休園です。\n歩きやすい靴でお越しください（約5km歩きます）。\n夏場は帽子と水分をご持参ください。",
    importantNotesEn: "East Gardens closed on Mondays & Fridays.\nWear comfortable shoes (approx. 5km walk).\nBring hat and water in summer.",
    bookingNotesJa: "楠木正成像前に集合。像は皇居外苑の南側にあります。",
    bookingNotesEn: "Meet at the Kusunoki Masashige statue on the south side of the Imperial Palace Outer Garden.",
    meetingPointDescJa: "皇居外苑 楠木正成像前。地下鉄千代田線 二重橋前駅 6番出口から徒歩3分。",
    meetingPointDescEn: "Kusunoki Masashige statue, Imperial Palace Outer Garden. 3 min walk from Nijubashimae Station Exit 6 (Chiyoda Line).",
    accessInfoJa: "東京メトロ千代田線 二重橋前駅 6番出口 徒歩3分\nJR東京駅 丸の内中央口 徒歩10分\n都営三田線 日比谷駅 B6出口 徒歩5分",
    accessInfoEn: "Tokyo Metro Chiyoda Line, Nijubashimae Station Exit 6 (3 min walk)\nJR Tokyo Station Marunouchi Central Exit (10 min walk)\nToei Mita Line, Hibiya Station Exit B6 (5 min walk)",
  }});
  await prisma.tour.update({ where: { id: tour6.id }, data: {
    spotId: spot5.id, area: "千代田区・中央区", areaDetail: "丸の内・銀座",
    imageUrls: JSON.stringify([
      "https://images.unsplash.com/photo-1755498476260-55af74a359a7?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop",
    ]),
    cancellationPolicy: "2日前まで無料キャンセル可。前日50%、当日100%。",
    paymentMethod: "ON_SITE",
    supportedLanguages: JSON.stringify(["ja", "en"]),
    tags: JSON.stringify(["グルメ", "銀座", "デパ地下", "和菓子"]),
    highlightsJa: "丸の内仲通りのおしゃれカフェ\n老舗和菓子店の季節限定品\n銀座のデパ地下で極上スイーツ\n隠れた名店のランチスポット",
    highlightsEn: "Stylish cafes along Marunouchi Naka-dori\nSeasonal sweets at century-old wagashi shops\nPremium sweets at Ginza department store basements\nHidden gem lunch spots",
    inclusionsJa: "ガイド料\n試食4品\nカフェでのドリンク1杯",
    inclusionsEn: "Guide fee\n4 tasting items\nOne drink at a cafe",
    importantNotesJa: "食物アレルギーがある方は事前にお知らせください。\nデパ地下は混雑する場合があります。",
    importantNotesEn: "Please inform us of food allergies in advance.\nDepartment store basements may be crowded.",
    bookingNotesJa: "東京駅丸の内南口の改札前に集合。",
    bookingNotesEn: "Meet at Tokyo Station Marunouchi South Exit gates.",
    meetingPointDescJa: "東京駅 丸の内南口。改札を出てすぐの広場。",
    meetingPointDescEn: "Tokyo Station Marunouchi South Exit. The plaza right outside the gates.",
    accessInfoJa: "JR各線 東京駅 丸の内南口 直結\n東京メトロ丸ノ内線 東京駅 直結",
    accessInfoEn: "JR Lines, Tokyo Station Marunouchi South Exit (direct)\nTokyo Metro Marunouchi Line, Tokyo Station (direct)",
  }});
  await prisma.tour.update({ where: { id: tour7.id }, data: {
    spotId: spot7.id, area: "中央区", areaDetail: "日本橋",
    imageUrls: JSON.stringify([
      "https://images.unsplash.com/photo-1488982861479-0b1597a86175?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop",
    ]),
    cancellationPolicy: "前日まで無料キャンセル可。当日100%。",
    paymentMethod: "ON_SITE",
    supportedLanguages: JSON.stringify(["ja", "en"]),
    tags: JSON.stringify(["歴史", "老舗", "伝統工芸", "日本橋"]),
    highlightsJa: "創業300年超の老舗刃物店を訪問\n伝統的な和紙専門店での手漉き体験\n日本橋の麒麟像と歴史を学ぶ\n老舗の甘味処で一服",
    highlightsEn: "Visit a 300-year-old cutlery shop\nHandmade washi paper experience at a specialty store\nLearn about the Nihonbashi kirin statues and history\nRest at a traditional sweet shop",
    inclusionsJa: "ガイド料\n和菓子と抹茶セット\n和紙のお土産1点",
    inclusionsEn: "Guide fee\nWagashi and matcha set\nOne washi paper souvenir",
    importantNotesJa: "一部の老舗は定休日がありますので、コースが変更になる場合があります。",
    importantNotesEn: "Some shops have regular holidays, so the route may be adjusted.",
    bookingNotesJa: "日本橋の麒麟像前に集合。橋の中央付近にある青銅の像が目印です。",
    bookingNotesEn: "Meet at the kirin statue on Nihonbashi bridge. Look for the bronze statue near the center of the bridge.",
    meetingPointDescJa: "日本橋 麒麟像前。東京メトロ銀座線・半蔵門線 三越前駅 B6出口から徒歩2分。",
    meetingPointDescEn: "Kirin statue on Nihonbashi bridge. 2 min walk from Mitsukoshimae Station Exit B6 (Ginza/Hanzomon Line).",
    accessInfoJa: "東京メトロ銀座線・半蔵門線 三越前駅 B6出口 徒歩2分\nJR総武線 新日本橋駅 徒歩5分",
    accessInfoEn: "Tokyo Metro Ginza/Hanzomon Line, Mitsukoshimae Station Exit B6 (2 min walk)\nJR Sobu Line, Shin-Nihombashi Station (5 min walk)",
  }});
  await prisma.tour.update({ where: { id: tour8.id }, data: {
    spotId: spot5.id, area: "千代田区", areaDetail: "丸の内",
    imageUrls: JSON.stringify([
      "https://images.unsplash.com/photo-1589085947283-29350e580893?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1551641506-ee5bf4cb45f1?w=800&h=600&fit=crop",
    ]),
    cancellationPolicy: "前日まで無料キャンセル可。当日100%。",
    paymentMethod: "ON_SITE",
    supportedLanguages: JSON.stringify(["ja", "en"]),
    tags: JSON.stringify(["建築", "東京駅", "レンガ", "近代建築"]),
    highlightsJa: "復元された赤レンガ駅舎の意匠を解説\n南北ドームの天井レリーフ\n丸の内仲通りのモダン建築群\nKITTEビル屋上からの駅舎全景",
    highlightsEn: "Detailed explanation of the restored red-brick station design\nCeiling reliefs in the north and south domes\nModern architecture along Marunouchi Naka-dori\nPanoramic view from KITTE building rooftop",
    inclusionsJa: "ガイド料",
    inclusionsEn: "Guide fee",
    importantNotesJa: "屋内外を移動します。天候に合わせた服装でお越しください。\nKITTE屋上は営業時間内のみ入場可能です。",
    importantNotesEn: "The tour moves between indoor and outdoor areas. Dress for the weather.\nKITTE rooftop is accessible only during business hours.",
    bookingNotesJa: "東京駅丸の内中央口の改札前に集合。",
    bookingNotesEn: "Meet at Tokyo Station Marunouchi Central Exit gates.",
    meetingPointDescJa: "東京駅 丸の内中央口。改札を出てすぐの広場。",
    meetingPointDescEn: "Tokyo Station Marunouchi Central Exit. The plaza right outside the gates.",
    accessInfoJa: "JR各線 東京駅 丸の内中央口 直結",
    accessInfoEn: "JR Lines, Tokyo Station Marunouchi Central Exit (direct)",
  }});
  await prisma.tour.update({ where: { id: tour9.id }, data: {
    spotId: spot6.id, area: "千代田区", areaDetail: "秋葉原",
    imageUrls: JSON.stringify([
      "https://images.unsplash.com/photo-1562221421-da28605eba10?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1528164344885-47b1492d932a?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=600&fit=crop",
    ]),
    cancellationPolicy: "前日まで無料キャンセル可。当日100%。",
    paymentMethod: "ON_SITE",
    supportedLanguages: JSON.stringify(["ja", "en"]),
    tags: JSON.stringify(["オタク", "アニメ", "ゲーム", "メイドカフェ"]),
    highlightsJa: "ラジオ会館でレアなフィギュア・グッズを探索\nレトロゲームセンターでの対戦体験\nメイドカフェでの「おかえりなさいませ」体験\nガチャガチャの聖地で運試し",
    highlightsEn: "Hunt for rare figures & goods at Radio Kaikan\nRetro arcade gaming experience\nMaid cafe 'welcome home' experience\nTry your luck at the gacha paradise",
    inclusionsJa: "ガイド料\nメイドカフェのドリンク1杯\nガチャガチャ2回分",
    inclusionsEn: "Guide fee\nOne drink at a maid cafe\nTwo gacha machine tries",
    importantNotesJa: "メイドカフェでは写真撮影にルールがあります（ガイドが説明します）。\n18歳未満の方は一部エリアに入場できません。",
    importantNotesEn: "Maid cafes have photography rules (guide will explain).\nSome areas are restricted to those under 18.",
    bookingNotesJa: "秋葉原駅 電気街口のロータリー前に集合。",
    bookingNotesEn: "Meet at the rotary in front of Akihabara Station Electric Town Exit.",
    meetingPointDescJa: "JR秋葉原駅 電気街口を出てすぐのロータリー。ラジオ会館の看板が目印。",
    meetingPointDescEn: "Rotary outside JR Akihabara Station Electric Town Exit. Look for the Radio Kaikan sign.",
    accessInfoJa: "JR山手線・総武線 秋葉原駅 電気街口 徒歩0分\n東京メトロ日比谷線 秋葉原駅 3番出口 徒歩3分\nつくばエクスプレス 秋葉原駅 A3出口 徒歩2分",
    accessInfoEn: "JR Yamanote/Sobu Line, Akihabara Station Electric Town Exit (direct)\nTokyo Metro Hibiya Line, Akihabara Station Exit 3 (3 min walk)\nTsukuba Express, Akihabara Station Exit A3 (2 min walk)",
  }});
  await prisma.tour.update({ where: { id: tour10.id }, data: {
    spotId: spot4.id, area: "千代田区", areaDetail: "皇居・丸の内",
    imageUrls: JSON.stringify([
      "https://images.unsplash.com/photo-1548148870-adbf75452257?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1582229817369-ba3cf267b608?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1551641506-ee5bf4cb45f1?w=800&h=600&fit=crop",
    ]),
    cancellationPolicy: "5日前まで無料キャンセル可。3日前50%、前日以降100%。",
    paymentMethod: "ONLINE",
    supportedLanguages: JSON.stringify(["ja", "en"]),
    tags: JSON.stringify(["プライベート", "皇居", "庭園", "VIP"]),
    highlightsJa: "皇居東御苑をプライベートガイドとゆっくり散策\n季節の花々と日本庭園の美しさを堪能\n江戸城の歴史を深く学べる解説付き\n丸の内エリアでのカフェ休憩",
    highlightsEn: "Leisurely stroll through East Gardens with a private guide\nEnjoy seasonal flowers and Japanese garden beauty\nIn-depth commentary on Edo Castle history\nCafe break in the Marunouchi area",
    inclusionsJa: "プライベートガイド料\n皇居東御苑入園（無料）\nカフェでのドリンク1杯",
    inclusionsEn: "Private guide fee\nImperial Palace East Gardens admission (free)\nOne drink at a cafe",
    importantNotesJa: "月曜・金曜は皇居東御苑が休園です。\nお客様のペースに合わせてゆっくり回ります。",
    importantNotesEn: "East Gardens closed on Mondays & Fridays.\nWe'll walk at your pace.",
    bookingNotesJa: "大手門前に集合。ガイドがお名前入りのプレートを持っています。",
    bookingNotesEn: "Meet at Otemon Gate. Guide will hold a sign with your name.",
    meetingPointDescJa: "皇居 大手門前。東京メトロ千代田線 大手町駅 C13a出口から徒歩5分。",
    meetingPointDescEn: "In front of Otemon Gate, Imperial Palace. 5 min walk from Otemachi Station Exit C13a (Chiyoda Line).",
    accessInfoJa: "東京メトロ千代田線・丸ノ内線 大手町駅 C13a出口 徒歩5分\nJR東京駅 丸の内北口 徒歩15分",
    accessInfoEn: "Tokyo Metro Chiyoda/Marunouchi Line, Otemachi Station Exit C13a (5 min walk)\nJR Tokyo Station Marunouchi North Exit (15 min walk)",
  }});
  console.log(`Tour content & gallery populated`);

  // --- PricingCategories & Rates ---
  // Create standard pricing categories and rates for each tour
  for (const tour of allTours) {
    const isPrivate = tour.tourType === "PRIVATE";
    const basePriceCents = tour.pricePerPersonCents;

    // PricingCategories
    const adultCat = await prisma.pricingCategory.create({
      data: {
        tourId: tour.id,
        label: "Adult",
        labelJa: "大人",
        minAge: 13,
        sortOrder: 1,
        isDefault: true,
      },
    });
    const childCat = await prisma.pricingCategory.create({
      data: {
        tourId: tour.id,
        label: "Child",
        labelJa: "子供",
        minAge: 4,
        maxAge: 12,
        sortOrder: 2,
      },
    });
    const infantCat = await prisma.pricingCategory.create({
      data: {
        tourId: tour.id,
        label: "Infant",
        labelJa: "幼児",
        minAge: 0,
        maxAge: 3,
        sortOrder: 3,
      },
    });

    // Default Rate
    const standardRate = await prisma.rate.create({
      data: {
        tourId: tour.id,
        label: "Standard",
        labelJa: "通常料金",
        isDefault: true,
      },
    });

    // RatePrices: Adult = base, Child = 50%, Infant = free
    await prisma.ratePrice.createMany({
      data: [
        { rateId: standardRate.id, pricingCategoryId: adultCat.id, priceCents: basePriceCents },
        { rateId: standardRate.id, pricingCategoryId: childCat.id, priceCents: Math.round(basePriceCents * 0.5) },
        { rateId: standardRate.id, pricingCategoryId: infantCat.id, priceCents: 0 },
      ],
    });

    // CapacityRule: weekdays for group tours, scattered for private
    if (!isPrivate) {
      await prisma.capacityRule.create({
        data: {
          tourId: tour.id,
          ruleType: "WEEKLY",
          daysOfWeek: JSON.stringify([1, 2, 3, 4, 5]), // Mon-Fri
          startTimes: JSON.stringify([
            { hour: 10, minute: 0 },
            { hour: 14, minute: 0 },
          ]),
          capacity: tour.maxParticipants,
          minParticipants: 1,
          priority: 1,
        },
      });
      // Weekend rule with different capacity
      await prisma.capacityRule.create({
        data: {
          tourId: tour.id,
          ruleType: "WEEKLY",
          daysOfWeek: JSON.stringify([0, 6]), // Sat, Sun
          startTimes: JSON.stringify([
            { hour: 9, minute: 0 },
            { hour: 13, minute: 0 },
            { hour: 16, minute: 0 },
          ]),
          capacity: tour.maxParticipants,
          minParticipants: 1,
          priority: 1,
        },
      });
    } else {
      // Private tours: Mon-Sun, one slot per day
      await prisma.capacityRule.create({
        data: {
          tourId: tour.id,
          ruleType: "WEEKLY",
          daysOfWeek: JSON.stringify([0, 1, 2, 3, 4, 5, 6]),
          startTimes: JSON.stringify([{ hour: 10, minute: 0 }]),
          capacity: 1,
          minParticipants: 1,
          priority: 1,
        },
      });
    }
  }
  console.log(`PricingCategories, Rates, and CapacityRules created for ${allTours.length} tours`);

  // --- Sample CloseOuts ---
  // Close some dates for realism
  await prisma.closeOut.create({
    data: {
      tourId: tour5.id, // Imperial Palace
      date: new Date("2026-03-20"), // Vernal Equinox Day
      reason: "春分の日（祝日）",
    },
  });
  await prisma.closeOut.create({
    data: {
      tourId: tour7.id, // Nihonbashi
      date: new Date("2026-03-23"),
      startTime: JSON.stringify({ hour: 10, minute: 0 }),
      reason: "午前ガイド不在",
    },
  });
  console.log(`CloseOuts created`);

  // --- TourSchedules (next 14 days) ---
  const now = new Date();

  function makeDateTime(base: Date, hour: number, minute: number): Date {
    const d = new Date(base);
    d.setHours(hour, minute, 0, 0);
    return d;
  }

  function addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  function dayOffset(days: number): Date {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d;
  }

  // Schedule patterns per tour
  type SchedulePattern = {
    tour: typeof tour1;
    days: number[];
    hours: number[];
    maxPart: number;
  };

  const patterns: SchedulePattern[] = [
    { tour: tour1, days: [1, 2, 4, 6, 8, 10, 12, 14], hours: [10, 14], maxPart: 8 },
    { tour: tour2, days: [1, 2, 3, 5, 7, 9, 11, 13], hours: [9], maxPart: 6 },
    { tour: tour3, days: [1, 3, 5, 7, 10, 13], hours: [13, 16], maxPart: 10 },
    { tour: tour4, days: [1, 2, 5, 8, 11, 14], hours: [11], maxPart: 1 },
    { tour: tour5, days: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], hours: [9, 14], maxPart: 12 },
    { tour: tour6, days: [1, 3, 5, 8, 10, 12, 14], hours: [11, 15], maxPart: 6 },
    { tour: tour7, days: [1, 2, 4, 7, 9, 11, 14], hours: [10], maxPart: 8 },
    { tour: tour8, days: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], hours: [10, 13, 16], maxPart: 10 },
    { tour: tour9, days: [1, 3, 5, 7, 9, 11, 13], hours: [13, 16], maxPart: 8 },
    { tour: tour10, days: [2, 4, 7, 10, 13], hours: [10], maxPart: 1 },
  ];

  // Some schedules have booked participants → capacity = maxPart - booked
  const bookedSeeds = [0, 0, 0, 1, 2, 3, 4, 5, 0, 0, 2, 0, 1, 0, 3, 0, 0, 6, 0, 2];
  let seedIdx = 0;

  const schedules: {
    tourId: string;
    startDateTime: Date;
    endDateTime: Date;
    capacity: number;
    status: string;
  }[] = [];

  for (const pattern of patterns) {
    for (const day of pattern.days) {
      for (const hour of pattern.hours) {
        const start = makeDateTime(dayOffset(day), hour, 0);
        const end = addMinutes(start, pattern.tour.durationMinutes);
        const booked = Math.min(
          bookedSeeds[seedIdx % bookedSeeds.length],
          pattern.maxPart
        );
        seedIdx++;
        const remaining = pattern.maxPart - booked;
        const status = remaining <= 0 ? "FULL" : "OPEN";
        schedules.push({
          tourId: pattern.tour.id,
          startDateTime: start,
          endDateTime: end,
          capacity: remaining,
          status,
        });
      }
    }
  }

  for (const s of schedules) {
    await prisma.tourSchedule.create({ data: s });
  }
  console.log(`Schedules created: ${schedules.length} entries`);

  // --- Guide 3 (yamada) ---
  const guide3 = await prisma.guide.upsert({
    where: { email: "yamada@example.com" },
    update: {},
    create: {
      email: "yamada@example.com",
      passwordHash: hashSync("guide123", 10),
      name: "山田健太",
      bio: "京都・奈良の文化遺産ツアーを専門にしています。日本史が大好きです。",
      languages: JSON.stringify(["ja", "en"]),
      areas: JSON.stringify(["kyoto", "nara", "osaka"]),
    },
  });
  console.log(`Guide3 created: ${guide3.name}`);

  // --- Bookings & Assignments ---
  // Pick two schedules from existing data for test bookings
  const schedule1 = await prisma.tourSchedule.findFirst({
    where: { status: "OPEN" },
    include: { tour: true },
    orderBy: { startDateTime: "asc" },
  });
  const schedule2 = await prisma.tourSchedule.findFirst({
    where: { status: "OPEN" },
    include: { tour: true },
    orderBy: { startDateTime: "desc" },
  });

  if (schedule1 && schedule2) {
    // Booking 1: CONFIRMED (guide accepted)
    const booking1 = await prisma.booking.create({
      data: {
        tourScheduleId: schedule1.id,
        travelerName: "Test User",
        travelerEmail: "test@example.com",
        numberOfGuests: 1,
        status: "CONFIRMED",
        bookingSource: "DIRECT",
      },
    });

    // Assignments for booking1: 2 declined, 1 accepted
    await prisma.guideAssignment.create({
      data: {
        bookingId: booking1.id,
        guideId: guide1.id,
        status: "DECLINED",
        declineReason: "テストのため",
        assignedAt: new Date(),
        respondedAt: new Date(),
      },
    });
    await prisma.guideAssignment.create({
      data: {
        bookingId: booking1.id,
        guideId: guide2.id,
        status: "DECLINED",
        declineReason: "Schedule conflict - guide unavailable",
        assignedAt: new Date(),
        respondedAt: new Date(),
      },
    });
    await prisma.guideAssignment.create({
      data: {
        bookingId: booking1.id,
        guideId: guide3.id,
        status: "ACCEPTED",
        assignedAt: new Date(),
        respondedAt: new Date(),
      },
    });

    // Booking 2: CONFIRMED (guide accepted)
    const booking2 = await prisma.booking.create({
      data: {
        tourScheduleId: schedule2.id,
        travelerName: "kapi",
        travelerEmail: "kapi@kapi",
        numberOfGuests: 1,
        specialRequests: "aaa",
        status: "CONFIRMED",
        bookingSource: "DIRECT",
      },
    });

    // Assignment for booking2: 1 accepted
    await prisma.guideAssignment.create({
      data: {
        bookingId: booking2.id,
        guideId: guide2.id,
        status: "ACCEPTED",
        assignedAt: new Date(),
        respondedAt: new Date(),
      },
    });

    console.log(`Bookings created: ${booking1.id}, ${booking2.id}`);
    console.log(`GuideAssignments created: 4 entries`);
  }

  // --- Companies (事業者) ---
  const company1 = await prisma.company.upsert({
    where: { email: "company1@example.com" },
    update: {},
    create: {
      email: "company1@example.com",
      passwordHash: hashSync("company123", 10),
      name: "施設A",
    },
  });
  const company2 = await prisma.company.upsert({
    where: { email: "company2@example.com" },
    update: {},
    create: {
      email: "company2@example.com",
      passwordHash: hashSync("company123", 10),
      name: "施設B",
    },
  });
  console.log(`Companies created: ${company1.name}, ${company2.name}`);

  // Link companies to spots
  await prisma.companySpot.upsert({
    where: { companyId_spotId: { companyId: company1.id, spotId: spot1.id } },
    update: {},
    create: { companyId: company1.id, spotId: spot1.id },
  });
  await prisma.companySpot.upsert({
    where: { companyId_spotId: { companyId: company1.id, spotId: spot2.id } },
    update: {},
    create: { companyId: company1.id, spotId: spot2.id },
  });
  await prisma.companySpot.upsert({
    where: { companyId_spotId: { companyId: company2.id, spotId: spot3.id } },
    update: {},
    create: { companyId: company2.id, spotId: spot3.id },
  });
  console.log(`CompanySpot links created`);

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
