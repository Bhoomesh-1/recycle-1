// src/components/WasteClassification.tsx
import React, { useCallback, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDropzone } from "react-dropzone";
import {
  Camera,
  Upload,
  CheckCircle,
  AlertTriangle,
  Leaf,
  Recycle,
  Loader2,
} from "lucide-react";
import {
  classifyWaste,
  validateImageForClassification,
  ClassificationResult,
} from "@/lib/ml-integration";
import { useAuth } from "../App";
import { useAuth as useSbAuth } from "@/lib/supabase";
import { awardPoints } from "@/lib/voucher-operations";
import { defaults } from "@/lib/config";

type ManualCategory = "biodegradable" | "recyclable" | "hazardous";

const categoryMeta: Record<
  ManualCategory,
  {
    label: string;
    icon: React.ComponentType<any>;
    color: string;
    tips: string[];
  }
> = {
  biodegradable: {
    label: "Biodegradable",
    icon: Leaf,
    color: "text-green-600",
    tips: [
      "Compost in a home or community compost bin",
      "Avoid mixing with plastic or metal",
      "Chop into smaller pieces to speed up composting",
    ],
  },
  recyclable: {
    label: "Recyclable",
    icon: Recycle,
    color: "text-blue-600",
    tips: [
      "Rinse items to remove food residue",
      "Flatten cardboard to save space",
      "Check local guidelines for accepted materials",
    ],
  },
  hazardous: {
    label: "Hazardous",
    icon: AlertTriangle,
    color: "text-red-600",
    tips: [
      "Never dispose in regular trash",
      "Store securely away from children and pets",
      "Take to a certified hazardous waste center",
    ],
  },
};

const WasteClassification: React.FC = () => {
  const { user, updateUser } = useAuth(); // your app auth context
  const { user: sbUser } = useSbAuth(); // optional Supabase auth
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [manualCategory, setManualCategory] = useState<ManualCategory | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const modelReady = true; // backend-based readiness; you can replace with real check

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (processing) return;
      const file = acceptedFiles?.[0];
      if (!file) return;

      const validation = validateImageForClassification(file);
      if (!validation.isValid) {
        alert(validation.error);
        return;
      }

      setProcessing(true);
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));

      try {
        const classification = await classifyWaste(file);
        setResult(classification);

        // award points: read default mapping and persist if supabase user present
        const type = (classification?.type || "recyclable") as keyof typeof defaults.pointsPerClassification;
        const pts = defaults.pointsPerClassification[type] ?? 10;

        try {
          if (sbUser?.id) {
            await awardPoints(sbUser.id, pts, `Classified ${type} waste`);
          } else {
            // fallback to local update if no supabase user
            updateUser?.({ points: (user?.points || 0) + pts });
          }
        } catch (e) {
          console.warn("Failed to persist points:", e);
          // still update local UI
          updateUser?.({ points: (user?.points || 0) + (defaults.pointsPerClassification[type] ?? 10) });
        }
      } catch (e) {
        console.error("Classification error:", e);
        alert("Failed to get prediction. Try again.");
      } finally {
        setProcessing(false);
      }
    },
    [processing, sbUser?.id, updateUser, user?.points],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
  });

  const guideCategory: ManualCategory | null = useMemo(() => {
    if (manualCategory) return manualCategory;
    if (result?.type) return result.type as ManualCategory;
    return null;
  }, [manualCategory, result]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Classify Waste</h1>
          <p className="text-muted-foreground">
            Upload a photo or select a category to get disposal guidance.
          </p>
        </div>
        <Badge variant="secondary">
          {modelReady ? "ML Ready" : "Mock Mode"}
        </Badge>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload or Scan</CardTitle>
            <CardDescription>
              Drag and drop an image or use your camera
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors ${
                isDragActive
                  ? "border-eco-primary bg-eco-primary/5"
                  : "border-border"
              }`}
            >
              <input {...getInputProps()} />
              <Camera className="w-10 h-10 mb-3 text-eco-primary" />
              <p className="font-medium">Drag and drop an image here</p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
              <div className="mt-4 flex gap-3">
                <Button onClick={() => inputRef.current?.click()} variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Choose File
                </Button>
                <Input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={async (e) => {
                    if (processing) return;
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const validation = validateImageForClassification(file);
                    if (!validation.isValid) {
                      alert(validation.error);
                      return;
                    }
                    setProcessing(true);
                    setSelectedFile(file);
                    setPreviewUrl(URL.createObjectURL(file));
                    try {
                      const classification = await classifyWaste(file);
                      setResult(classification);
                      const type = (classification?.type || "recyclable") as keyof typeof defaults.pointsPerClassification;
                      const pts = defaults.pointsPerClassification[type] ?? 10;
                      if (sbUser?.id) {
                        await awardPoints(sbUser.id, pts, `Classified ${type} waste`);
                      } else {
                        updateUser?.({ points: (user?.points || 0) + pts });
                      }
                    } catch (err) {
                      console.error("Failed to classify from file input:", err);
                      alert("Failed to get prediction. Try again.");
                    } finally {
                      setProcessing(false);
                    }
                  }}
                />
              </div>
            </div>

            <AnimatePresence>
              {(previewUrl || processing) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-6 grid sm:grid-cols-2 gap-4"
                >
                  <div className="rounded-lg overflow-hidden bg-muted/30 aspect-video flex items-center justify-center">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {result?.type && (
                        <>
                          {React.createElement(
                            categoryMeta[result.type as ManualCategory].icon,
                            {
                              className: `w-5 h-5 ${categoryMeta[result.type as ManualCategory].color}`,
                            },
                          )}
                          <span className="font-semibold capitalize">
                            {result.type}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Confidence</span>
                        <span className="font-medium">{result?.confidence ?? "--"}%</span>
                      </div>
                      <Progress value={result?.confidence || 0} />
                      {result?.processingTime && (
                        <p className="text-xs text-muted-foreground">
                          Processed in {result.processingTime} ms
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manual Category Selection</CardTitle>
            <CardDescription>Pick a category if you already know it</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(
                ["biodegradable", "recyclable", "hazardous"] as ManualCategory[]
              ).map((cat) => {
                const Icon = categoryMeta[cat].icon;
                const active = guideCategory === cat;
                return (
                  <Button
                    key={cat}
                    variant={active ? "default" : "outline"}
                    className={active ? "bg-gradient-to-r from-eco-primary to-eco-secondary text-white" : ""}
                    onClick={() => setManualCategory(cat)}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {categoryMeta[cat].label}
                  </Button>
                );
              })}
            </div>

            <div className="mt-6">
              <h3 className="font-semibold mb-2">Disposal Guide</h3>
              <div className="space-y-2">
                {guideCategory ? (
                  categoryMeta[guideCategory].tips.map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-eco-primary mt-0.5" />
                      <span>{tip}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Upload an image or choose a category to see disposal tips.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
                <CardDescription>Your action helps keep our planet clean.</CardDescription>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/30">
                  <div className="text-xs text-muted-foreground">Detected Type</div>
                  <div className="text-lg font-semibold capitalize">{result.type}</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/30">
                  <div className="text-xs text-muted-foreground">Confidence</div>
                  <div className="text-lg font-semibold">{result.confidence}%</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/30">
                  <div className="text-xs text-muted-foreground">Points Earned</div>
                  <div className="text-lg font-semibold">{user?.points ? 10 : 10}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WasteClassification;
