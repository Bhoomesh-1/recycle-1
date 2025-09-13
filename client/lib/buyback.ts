import { supabase } from './supabase';

export type MaterialType = 'plastic' | 'paper' | 'metal' | 'glass' | 'e-waste' | 'other';

export interface BuybackOrder {
  id: string;
  user_id: string;
  material_type: MaterialType;
  weight_kg: number;
  price_quote: number;
  status: 'quote' | 'confirmed' | 'picked_up' | 'paid' | 'cancelled';
  pickup_id?: string | null;
  payout_ref?: string | null;
  created_at: string;
}

const LS_KEY = 'ecosort_buyback_local';
const readLocal = (): BuybackOrder[] => { try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; } };
const writeLocal = (list: BuybackOrder[]) => { try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {} };

export function getPriceQuote(material: MaterialType, weightKg: number): number {
  const rates: Record<MaterialType, number> = { plastic: 10, paper: 6, metal: 25, glass: 2, 'e-waste': 40, other: 3 };
  return Math.round((rates[material] * weightKg) * 100) / 100;
}

export async function createBuybackOrder(input: { user_id: string; material_type: MaterialType; weight_kg: number; }): Promise<BuybackOrder> {
  const quote = getPriceQuote(input.material_type, input.weight_kg);
  if (!supabase) {
    const item: BuybackOrder = { id: `local-${Date.now()}`, user_id: input.user_id, material_type: input.material_type, weight_kg: input.weight_kg, price_quote: quote, status: 'quote', created_at: new Date().toISOString() };
    const list = readLocal(); list.unshift(item); writeLocal(list); return item;
  }
  const { data, error } = await supabase.from('buyback_orders').insert({ user_id: input.user_id, material_type: input.material_type, weight_kg: input.weight_kg, price_quote: quote, status: 'quote' }).select('*').single();
  if (error) throw error;
  return data as BuybackOrder;
}

export async function listBuybackOrders(userId: string): Promise<BuybackOrder[]> {
  if (!supabase) return readLocal().filter(o=>o.user_id===userId).sort((a,b)=>b.created_at.localeCompare(a.created_at));
  const { data, error } = await supabase.from('buyback_orders').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data||[]) as BuybackOrder[];
}
