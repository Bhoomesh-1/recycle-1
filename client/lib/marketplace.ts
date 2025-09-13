import { supabase } from "@/lib/supabase";

export type ListingCondition = "new" | "used" | "repair";
export type ListingCategory =
  | "electronics"
  | "furniture"
  | "books"
  | "clothes"
  | "other";

export interface Listing {
  id: string;
  user_id: string;
  title: string;
  category: ListingCategory;
  condition: ListingCondition;
  description?: string;
  price: number;
  images: string[]; // URLs or data URLs
  created_at: string;
}

export interface Order {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  price: number;
  status: "pending" | "confirmed" | "paid" | "delivered" | "cancelled";
  created_at: string;
}

export interface Offer {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  offer_price: number;
  status: "open" | "accepted" | "rejected" | "withdrawn";
  created_at: string;
}

const LS_LISTINGS = "ecosort_market_listings";
const LS_ORDERS = "ecosort_market_orders";
const LS_OFFERS = "ecosort_market_offers";

const read = <T>(k: string): T[] => {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};
const write = (k: string, v: any) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

export async function createListing(
  input: Omit<Listing, "id" | "created_at">,
): Promise<Listing> {
  const item: Listing = {
    id: `local-${Date.now()}`,
    created_at: new Date().toISOString(),
    ...input,
  };
  if (!supabase) {
    const list = read<Listing>(LS_LISTINGS);
    list.unshift(item);
    write(LS_LISTINGS, list);
    return item;
  }
  const { data, error } = await supabase
    .from("marketplace_listings")
    .insert({
      user_id: input.user_id,
      title: input.title,
      category: input.category,
      condition: input.condition,
      description: input.description,
      price: input.price,
      images: input.images,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Listing;
}

export async function listListings(filter?: {
  category?: ListingCategory;
  condition?: ListingCondition;
  q?: string;
  min?: number;
  max?: number;
}): Promise<Listing[]> {
  if (!supabase) {
    let items = read<Listing>(LS_LISTINGS);
    if (filter?.category)
      items = items.filter((i) => i.category === filter.category);
    if (filter?.condition)
      items = items.filter((i) => i.condition === filter.condition);
    if (filter?.q)
      items = items.filter((i) =>
        (i.title + " " + (i.description || ""))
          .toLowerCase()
          .includes(filter.q!.toLowerCase()),
      );
    if (filter?.min != null)
      items = items.filter((i) => i.price >= (filter.min as number));
    if (filter?.max != null)
      items = items.filter((i) => i.price <= (filter.max as number));
    return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  let q = supabase.from("marketplace_listings").select("*");
  if (filter?.category) q = q.eq("category", filter.category);
  if (filter?.condition) q = q.eq("condition", filter.condition);
  if (filter?.min != null) q = q.gte("price", filter.min as number);
  if (filter?.max != null) q = q.lte("price", filter.max as number);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  let items = (data || []) as Listing[];
  if (filter?.q)
    items = items.filter((i) =>
      (i.title + " " + (i.description || ""))
        .toLowerCase()
        .includes(filter.q!.toLowerCase()),
    );
  return items;
}

export async function getListing(id: string): Promise<Listing | null> {
  if (!supabase) {
    return read<Listing>(LS_LISTINGS).find((i) => i.id === id) || null;
  }
  const { data } = await supabase
    .from("marketplace_listings")
    .select("*")
    .eq("id", id)
    .single();
  return (data as Listing) || null;
}

export async function createOrder(
  input: Omit<Order, "id" | "created_at" | "status">,
): Promise<Order> {
  const ord: Order = {
    id: `local-${Date.now()}`,
    created_at: new Date().toISOString(),
    status: "pending",
    ...input,
  };
  if (!supabase) {
    const list = read<Order>(LS_ORDERS);
    list.unshift(ord);
    write(LS_ORDERS, list);
    return ord;
  }
  const { data, error } = await supabase
    .from("marketplace_orders")
    .insert({
      listing_id: input.listing_id,
      buyer_id: input.buyer_id,
      seller_id: input.seller_id,
      price: input.price,
      status: "pending",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Order;
}

export async function createOffer(
  input: Omit<Offer, "id" | "created_at" | "status">,
): Promise<Offer> {
  const off: Offer = {
    id: `local-${Date.now()}`,
    created_at: new Date().toISOString(),
    status: "open",
    ...input,
  };
  if (!supabase) {
    const list = read<Offer>(LS_OFFERS);
    list.unshift(off);
    write(LS_OFFERS, list);
    return off;
  }
  const { data, error } = await supabase
    .from("marketplace_offers")
    .insert({
      listing_id: input.listing_id,
      buyer_id: input.buyer_id,
      seller_id: input.seller_id,
      offer_price: input.offer_price,
      status: "open",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Offer;
}
