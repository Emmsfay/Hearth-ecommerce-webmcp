export const products = [
  {
    id: "mug",
    name: "Stoneware mug",
    price: 28,
    was: 35,
    sold: 214,
    category: "table",
    image: "/public/products/mug.jpg",
    blurb: "A heavy everyday cup. Holds heat, sits steady.",
    detail: "Thrown in small batches. Dishwasher safe. 320ml.",
  },
  {
    id: "napkins",
    name: "Linen napkin set",
    price: 36,
    was: 45,
    sold: 88,
    category: "table",
    image: "/public/products/napkins.jpg",
    blurb: "Four washed-linen napkins. Soft from the first wash.",
    detail: "Natural flax. 42cm square. Set of four.",
  },
  {
    id: "skillet",
    name: "Cast iron skillet",
    price: 84,
    was: 110,
    sold: 61,
    category: "kitchen",
    image: "/public/products/skillet.jpg",
    blurb: "One pan for eggs, bread, and Sunday chicken.",
    detail: "26cm. Pre-seasoned. Oven safe to 260°C.",
  },
  {
    id: "board",
    name: "Oak cutting board",
    price: 54,
    was: 68,
    sold: 73,
    category: "kitchen",
    image: "/public/products/board.jpg",
    blurb: "End-grain oak. Kind to knives, built to last.",
    detail: "40 × 28cm. Food-safe oil finish.",
  },
  {
    id: "bowl",
    name: "Serving bowl",
    price: 32,
    was: 40,
    sold: 156,
    category: "table",
    image: "/public/products/bowl.jpg",
    blurb: "Wide enough for salad, deep enough for stew.",
    detail: "Speckled glaze. 24cm across.",
  },
  {
    id: "candles",
    name: "Beeswax tapers",
    price: 22,
    was: 28,
    sold: 190,
    category: "care",
    image: "/public/products/candles.jpg",
    blurb: "A pair of tapers. Slow burn, clean scent.",
    detail: "Two candles. About 8 hours each.",
  },
  {
    id: "soap",
    name: "Olive oil soap",
    price: 12,
    was: 16,
    sold: 340,
    category: "care",
    image: "/public/products/soap.jpg",
    blurb: "A simple bar for the sink. No perfume.",
    detail: "Cold-pressed olive oil. 120g.",
  },
  {
    id: "throw",
    name: "Wool throw",
    price: 96,
    was: 120,
    sold: 42,
    category: "care",
    image: "/public/products/throw.jpg",
    blurb: "A dense wool blanket for the sofa or the end of the bed.",
    detail: "130 × 180cm. Undyed merino.",
  },
];

export const categories = [
  { id: "all", label: "All" },
  { id: "kitchen", label: "Kitchen" },
  { id: "table", label: "Table" },
  { id: "care", label: "Home & care" },
];

export function money(value) {
  return `£${value.toFixed(2)}`;
}

export function findProduct(id) {
  return products.find((item) => item.id === id);
}
