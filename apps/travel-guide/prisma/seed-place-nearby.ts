// PlaceNearby mock seed — 程序化生成 13 类周边 POI（孩子需求维度）
// 运行：DATABASE_URL=postgresql://... npx tsx prisma/seed-place-nearby.ts
import { PrismaClient, PlaceNearbyCategory } from '@prisma/client';

const prisma = new PrismaClient();

// 13 类周边的程序化模板
const CATEGORY_TEMPLATES: Record<PlaceNearbyCategory, (cityName: string, placeName: string) => Array<{
  name: string;
  distance: number;
  extra: Record<string, unknown>;
}>> = {
  KID_RESTAURANT: (c, p) => [
    { name: `${c}海底捞(${p}店)`, distance: 380, extra: { hasKidsMenu: true, avgPrice: 120 } },
    { name: `${c}外婆家(${p}店)`, distance: 520, extra: { hasKidsMenu: true, avgPrice: 80, walkInOk: true } },
    { name: `${c}肯德基儿童乐园餐厅`, distance: 280, extra: { hasKidsMenu: true, hasPlayArea: true } },
  ],
  NURSING_ROOM: (c, p) => [
    { name: `${p}一层服务台旁母婴室`, distance: 50, extra: { isFree: true, hasHotWater: true } },
    { name: `${p}二层母婴室`, distance: 80, extra: { isFree: true } },
    { name: `${c}商场三楼母婴室(2km 内)`, distance: 1200, extra: { isFree: true, hasHotWater: true } },
  ],
  TAP_WATER: (c, p) => [
    { name: `${p}园区直饮水点(北门内)`, distance: 120, extra: { isFree: true } },
    { name: `${p}园区直饮水点(南门)`, distance: 220, extra: { isFree: true } },
  ],
  CONVENIENCE: (c, p) => [
    { name: `全家便利店(${p}店)`, distance: 250, extra: { hasMilkPowder: true, hasDiapers: true } },
    { name: `7-Eleven(${c}${p}附近)`, distance: 320, extra: { hasMilkPowder: true } },
    { name: `罗森便利店`, distance: 480, extra: { hasDiapers: true } },
  ],
  TOY_STORE: (c, p) => [
    { name: `玩具反斗城(${c}店)`, distance: 850, extra: { hasLego: true, hasPopMart: true } },
    { name: `乐高专卖店(${c})`, distance: 1100, extra: { hasLego: true } },
    { name: `泡泡玛特(${c}旗舰)`, distance: 1400, extra: { hasPopMart: true } },
  ],
  BOOKSTORE: (c, p) => [
    { name: `蒲蒲兰绘本馆(${c})`, distance: 720, extra: { ageRange: '0-6' } },
    { name: `西西弗里书店(${c}店)`, distance: 980, extra: { hasKidsSection: true } },
    { name: `老约翰绘本馆`, distance: 1300, extra: { ageRange: '3-9' } },
  ],
  KIDS_HOSPITAL: (c, p) => [
    { name: `${c}儿童医院`, distance: 2200, extra: { hasPediatrics: true, hasER: true } },
    { name: `${c}妇幼保健院`, distance: 3100, extra: { hasPediatrics: true } },
  ],
  PHARMACY: (c, p) => [
    { name: `老百姓大药房(${p}店)`, distance: 320, extra: { hasChildMedicine: true } },
    { name: `同仁堂药店(${c})`, distance: 580, extra: { hasChildMedicine: true } },
  ],
  MATERNITY_STORE: (c, p) => [
    { name: `孩子王(${c}店)`, distance: 1200, extra: { hasMilkPowder: true, hasDiapers: true } },
    { name: `爱婴室(${c})`, distance: 1800, extra: { hasMilkPowder: true } },
  ],
  DIDI_PICKUP: (c, p) => [
    { name: `${p}北门网约车点`, distance: 30, extra: { notes: '南门出来 30 米路北' } },
    { name: `${p}东门网约车点`, distance: 150, extra: {} },
  ],
  TAXI_STAND: (c, p) => [
    { name: `${p}正门出租车候车区`, distance: 20, extra: { hasQueue: true } },
    { name: `${p}南门出租车候车区`, distance: 200, extra: {} },
  ],
  KID_HOTEL: (c, p) => [
    { name: `${c}亲子主题酒店(${p}店)`, distance: 1500, extra: { hasFamilyRoom: true, hasKidsPool: true, hasKidsBreakfast: true } },
    { name: `${c}国际度假酒店`, distance: 2200, extra: { hasKidsPool: true, hasKidsBreakfast: true } },
    { name: `${c}快捷亲子公寓`, distance: 800, extra: { hasFamilyRoom: true, hasCrib: true } },
  ],
  STROLLER_FRIENDLY: (c, p) => [
    { name: `${p}主通道(全程无台阶)`, distance: 0, extra: { hasRamp: true, hasElevator: true } },
    { name: `${p}北门无障碍入口`, distance: 50, extra: { hasRamp: true } },
  ],
};

async function main() {
  const spots = await prisma.spot.findMany({ select: { id: true, name: true, cityId: true, city: { select: { name: true } } } });
  console.log(`[seed-nearby] 找到 ${spots.length} 个 spot`);

  let count = 0;
  for (const spot of spots) {
    const cityName = spot.city.name;
    for (const [category, gen] of Object.entries(CATEGORY_TEMPLATES) as [PlaceNearbyCategory, ReturnType<typeof CATEGORY_TEMPLATES[PlaceNearbyCategory]>][]) {
      const items = gen(cityName, spot.name);
      for (const it of items) {
        await prisma.placeNearby.upsert({
          where: { id: `${spot.id}-${category}-${count}` },
          create: {
            id: `${spot.id}-${category}-${count}`,
            placeId: spot.id,
            placeType: 'sight',
            category,
            name: it.name,
            distanceMeters: it.distance,
            extra: it.extra,
            source: 'mock',
            isVerified: false,
          },
          update: {},
        });
        count++;
      }
    }
  }
  console.log(`[seed-nearby] 写入 ${count} 条 PlaceNearby（13 类 × ${spots.length} spot）`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());