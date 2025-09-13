import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/supabase";
import {
  createBuybackOrder,
  listBuybackOrders,
  MaterialType,
  getPriceQuote,
  BuybackOrder,
} from "@/lib/buyback";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { awardPoints } from "@/lib/voucher-operations";
import { supabase as sb } from "@/lib/supabase";

export default function BuyBackPage() {
  const { user } = useAuth();
  const [material, setMaterial] = useState<MaterialType>("plastic");
  const [weight, setWeight] = useState(1);
  const [orders, setOrders] = useState<BuybackOrder[]>([]);
  const { toast } = useToast();
  const quote = getPriceQuote(material, weight);

  const load = async () => {
    const data = await listBuybackOrders(user?.id || "mock-user-1");
    setOrders(data);
  };
  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    const order = await createBuybackOrder({
      user_id: user?.id || "mock-user-1",
      material_type: material,
      weight_kg: weight,
    });
    await load();
    if (sb && user?.id) {
      try {
        const pts = Math.max(1, Math.round(order.price_quote / 10));
        await awardPoints(
          user.id,
          pts,
          `Buy-back order for ${order.material_type}`,
        );
      } catch {}
    }
    toast({ title: "Order created", description: `Quote: ₹${quote}` });
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Sell Recyclables (Buy-Back)</CardTitle>
          <CardDescription>
            Get instant price quotes and schedule a pickup with partners.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Material</Label>
              <Select
                value={material}
                onValueChange={(v) => setMaterial(v as MaterialType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plastic">Plastic</SelectItem>
                  <SelectItem value="paper">Paper</SelectItem>
                  <SelectItem value="metal">Metal</SelectItem>
                  <SelectItem value="glass">Glass</SelectItem>
                  <SelectItem value="e-waste">E-waste</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Weight (kg)</Label>
              <Input
                type="number"
                min={0.1}
                step={0.1}
                value={weight}
                onChange={(e) =>
                  setWeight(parseFloat(e.target.value || "0") || 0)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Estimated Payout</Label>
              <div className="p-3 rounded bg-slate-800 text-white">
                ₹{quote}
              </div>
            </div>
          </div>
          <Button onClick={submit}>Create Order</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {orders.map((o) => (
            <div
              key={o.id}
              className="p-3 rounded bg-slate-800/40 text-white flex justify-between"
            >
              <div>
                {o.material_type} • {o.weight_kg}kg • ₹{o.price_quote}
              </div>
              <div className="text-sm opacity-70">{o.status}</div>
            </div>
          ))}
          {orders.length === 0 && (
            <div className="text-gray-400">No orders yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
