// gallery scripts —— 只做一件事:为数据组件(DataList/Table/Chart/Sparkline/Map/
// Pagination/Select-collection)填 demo 数据。Page onEnter={() => scripts.seed()} 触发。
// data.upsert(by_field) 幂等:重复进入不重复插入。

const APP_ID = "gallery";

const PEOPLE = [
  { n: 1, name: "Amelia Chen", role: "Design",     city: "Tokyo",     score: 92 },
  { n: 2, name: "Bruno Sato",  role: "Frontend",   city: "Osaka",     score: 88 },
  { n: 3, name: "Carla Diaz",  role: "Backend",    city: "Madrid",    score: 95 },
  { n: 4, name: "Deng Wei",    role: "Data",       city: "Shanghai",  score: 79 },
  { n: 5, name: "Elif Kaya",   role: "Product",    city: "Istanbul",  score: 84 },
  { n: 6, name: "Farah Nasser",role: "Mobile",     city: "Dubai",     score: 90 },
  { n: 7, name: "Gustavo Lima",role: "Infra",      city: "São Paulo", score: 73 },
  { n: 8, name: "Hana Ito",    role: "QA",         city: "Kyoto",     score: 81 },
];

// 简单确定性折线序列(cpu/mem 双序列)。
const METRICS = Array.from({ length: 12 }, (_, i) => ({
  ts: i + 1,
  cpu: Math.round(40 + 30 * Math.sin(i / 2) + i),
  mem: Math.round(55 + 20 * Math.cos(i / 3)),
}));

const PLACES = [
  { n: 1, name: "Tokyo",     lat: 35.68, lng: 139.76 },
  { n: 2, name: "Osaka",     lat: 34.69, lng: 135.50 },
  { n: 3, name: "Kyoto",     lat: 35.01, lng: 135.77 },
  { n: 4, name: "Nagoya",    lat: 35.18, lng: 136.91 },
];

export default {
  seed() {
    for (const p of PEOPLE) aglet.data.upsert(APP_ID, "people", "n", p);
    for (const m of METRICS) aglet.data.upsert(APP_ID, "metrics", "ts", m);
    for (const pl of PLACES) aglet.data.upsert(APP_ID, "places", "n", pl);
    return { people: PEOPLE.length, metrics: METRICS.length, places: PLACES.length };
  },
};
