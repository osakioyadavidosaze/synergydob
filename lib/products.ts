export const CATEGORIES = [
  "Grains & Rice",
  "Tubers & Yam",
  "Oils & Seasoning",
  "Beans & Legumes",
  "Vegetables & Spices",
  "Provisions",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type Product = {
  id: string;
  name: string;
  category: Category;
  price_ngn: number;
  unit: string;
  image_url: string | null;
  in_stock: boolean;
  created_at: string;
};

export type ProductInput = Pick<
  Product,
  "name" | "category" | "price_ngn" | "unit" | "image_url" | "in_stock"
>;
