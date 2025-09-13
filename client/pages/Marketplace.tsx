import React, { useEffect, useState } from "react";
import {
  listListings,
  Listing,
  ListingCategory,
  ListingCondition,
} from "@/lib/marketplace";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function MarketplacePage() {
  const [items, setItems] = useState<Listing[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<ListingCategory | "all">("all");
  const [condition, setCondition] = useState<ListingCondition | "all">("all");

  const load = async () => {
    const res = await listListings({
      q: q || undefined,
      category: category === "all" ? undefined : category,
      condition: condition === "all" ? undefined : condition,
    });
    setItems(res);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Marketplace</h1>
          <p className="text-gray-400">Buy pre-loved items or list yours.</p>
        </div>
        <Link to="/sell-item">
          <Button>Sell an Item</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter listings</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            placeholder="Search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Select value={category} onValueChange={(v) => setCategory(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="electronics">Electronics</SelectItem>
              <SelectItem value="furniture">Furniture</SelectItem>
              <SelectItem value="books">Books</SelectItem>
              <SelectItem value="clothes">Clothes</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={condition}
            onValueChange={(v) => setCondition(v as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="used">Used</SelectItem>
              <SelectItem value="repair">Repair Needed</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={load}>Apply</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((it) => (
          <Link to={`/listing/${it.id}`} key={it.id} className="block">
            <Card className="overflow-hidden hover:shadow-lg transition">
              {it.images?.[0] && (
                <img
                  src={it.images[0]}
                  alt={it.title}
                  className="w-full h-40 object-cover"
                />
              )}
              <CardContent className="p-4 space-y-1">
                <div className="font-semibold text-white">{it.title}</div>
                <div className="text-sm text-gray-400">
                  {it.category} • {it.condition}
                </div>
                <div className="text-green-400 font-bold">₹{it.price}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {items.length === 0 && (
          <div className="text-gray-400">No listings found.</div>
        )}
      </div>
    </div>
  );
}
