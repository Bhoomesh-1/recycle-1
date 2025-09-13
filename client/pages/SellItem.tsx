import React, { useState } from "react";
import {
  createListing,
  ListingCategory,
  ListingCondition,
} from "@/lib/marketplace";
import { useAuth } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function SellItemPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ListingCategory>("electronics");
  const [condition, setCondition] = useState<ListingCondition>("used");
  const [price, setPrice] = useState<number>(0);
  const [desc, setDesc] = useState("");
  const [images, setImages] = useState<string[]>([]);

  const onImage = async (file: File) => {
    const url = await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.readAsDataURL(file);
    });
    setImages((prev) => [...prev, url]);
  };

  const submit = async () => {
    if (!title || price <= 0) {
      toast({ title: "Please fill title and price" });
      return;
    }
    const listing = await createListing({
      user_id: user?.id || "mock-user-1",
      title,
      category,
      condition,
      description: desc,
      price,
      images,
    });
    toast({ title: "Listing created", description: listing.title });
    nav("/marketplace");
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Sell an Item</CardTitle>
          <CardDescription>List your pre-loved item for sale</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
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
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="used">Used</SelectItem>
                <SelectItem value="repair">Repair Needed</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Price (₹)"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value || "0") || 0)}
            />
          </div>
          <Textarea
            placeholder="Description"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <div className="space-y-2">
            <div className="text-sm text-gray-400">Images</div>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImage(f);
              }}
            />
            <div className="flex gap-2 flex-wrap">
              {images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt="preview"
                  className="w-24 h-24 object-cover rounded"
                />
              ))}
            </div>
          </div>
          <Button onClick={submit}>Create Listing</Button>
        </CardContent>
      </Card>
    </div>
  );
}
