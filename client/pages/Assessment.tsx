import React, { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useDropzone } from "react-dropzone";
import {
  Camera,
  Upload,
  MapPin,
  QrCode,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  useWasteClassification,
  validateImageForClassification,
} from "@/lib/ml-integration";
import {
  useGeolocation,
  useRecyclingCentersSearch,
  getDirectionsUrl,
  RecyclingFacility,
} from "@/lib/openstreetmap";
import { useAuth } from "../App";
import { useAuth as useSbAuth } from "@/lib/supabase";
import { awardPoints } from "@/lib/voucher-operations";

type Step = 1 | 2 | 3 | 4;

const Assessment: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { user: sbUser } = useSbAuth();
  const { classifyWaste, loading: classifying } = useWasteClassification();
  const { location, getCurrentLocation } = useGeolocation();
  const {
    centers,
    searchNearbyRecyclingCenters,
    loading: searching,
  } = useRecyclingCentersSearch();

  const [step, setStep] = useState<Step>(1);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [classification, setClassification] = useState<any>(null);
  const [selectedCenter, setSelectedCenter] =
    useState<RecyclingFacility | null>(null);
  const [qrCodeValue, setQrCodeValue] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [processing, setProcessing] = useState(false);

  const onDrop = async (acceptedFiles: File[]) => {
    if (processing) return;
    const file = acceptedFiles?.[0];
    if (!file) return;
    const validation = validateImageForClassification(file);
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }
    setProcessing(true);
    setPreviewUrl(URL.createObjectURL(file));
    const result = await classifyWaste(file);
    setClassification(result);
    setProcessing(false);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
  });

  const progressPercent = useMemo(() => {
    if (step === 1) return 10;
    if (step === 2) return 45;
    if (step === 3) return 80;
    return 100;
  }, [step]);

  const handleLocateCenters = async () => {
    const loc = location || (await getCurrentLocation());
    await searchNearbyRecyclingCenters(loc, 10);
  };

  const handleVerifyQR = async () => {
    setVerifying(true);
    // Mock QR validation: any non-empty value is accepted
    await new Promise((r) => setTimeout(r, 800));
    const ok = qrCodeValue.trim().length > 0;
    setVerified(ok);
    setVerifying(false);
    if (ok) {
      // Award points and persist when Supabase user is available
      const bonus = 10;
      try {
        if (sbUser?.id) {
          await awardPoints(
            sbUser.id,
            bonus,
            "QR verified at recycling center",
          );
        } else {
          updateUser({ points: (user?.points || 0) + bonus });
        }
      } catch (e) {
        const msg = (e as any)?.message || String(e);
        console.warn("Point award failed:", msg);
        updateUser({ points: (user?.points || 0) + bonus });
      }
      setStep(4);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Assessment</h1>
        <p className="text-muted-foreground">
          Scan waste → Select center → Scan QR → Earn rewards
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Guided Workflow</CardTitle>
              <CardDescription>
                Follow the steps to complete your assessment
              </CardDescription>
            </div>
            <div className="min-w-[160px]">
              <Progress value={progressPercent} />
              <div className="text-xs text-muted-foreground mt-1">
                {progressPercent}%
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-3 gap-6">
            <div
              className={`rounded-xl p-4 border ${step === 1 ? "border-eco-primary" : "border-border"}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step > 1 ? "bg-eco-primary text-white" : "bg-muted"}`}
                >
                  {step > 1 ? "✓" : "1"}
                </div>
                <div className="font-medium">Waste Scanning</div>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Upload or capture a photo to predict the category.
              </p>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-4 text-center ${isDragActive ? "border-eco-primary bg-eco-primary/5" : "border-border"}`}
              >
                <input {...getInputProps()} />
                <Camera className="w-6 h-6 mx-auto mb-2 text-eco-primary" />
                <div className="text-sm font-medium">
                  Drag & drop or click to upload
                </div>
                <div className="text-xs text-muted-foreground">
                  PNG, JPG up to 10MB
                </div>
              </div>
              <div className="mt-2 text-right">
                <Input
                  type="file"
                  accept="image/*"
                  capture="environment"
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
                    setPreviewUrl(URL.createObjectURL(file));
                    const result = await classifyWaste(file);
                    setClassification(result);
                    setProcessing(false);
                  }}
                />
              </div>
              <AnimatePresence>
                {(previewUrl || classifying) && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="mt-3"
                  >
                    <div className="rounded-md overflow-hidden bg-muted/30 aspect-video flex items-center justify-center">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      )}
                    </div>
                    {classification && (
                      <div className="mt-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="capitalize">
                            {classification.type}
                          </Badge>
                          <span className="text-muted-foreground">
                            {classification.confidence}%
                          </span>
                        </div>
                        <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                          {classification.details?.recommendations?.map(
                            (r: string, i: number) => (
                              <li key={i}>{r}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="mt-3 flex justify-end">
                <Button
                  disabled={!classification}
                  onClick={() => setStep(2)}
                  className="bg-gradient-to-r from-eco-primary to-eco-secondary text-white"
                >
                  Next
                </Button>
              </div>
            </div>

            <div
              className={`rounded-xl p-4 border ${step === 2 ? "border-eco-primary" : "border-border"} ${step < 2 ? "opacity-50 pointer-events-none" : ""}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step > 2 ? "bg-eco-primary text-white" : "bg-muted"}`}
                >
                  {step > 2 ? "✓" : "2"}
                </div>
                <div className="font-medium">Select Nearest Center</div>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Find and choose a center that accepts your waste type.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleLocateCenters}>
                  <MapPin className="w-4 h-4 mr-2" /> Find Nearby
                </Button>
              </div>
              <div className="mt-3 space-y-2 max-h-64 overflow-auto">
                {centers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCenter(c)}
                    className={`w-full text-left p-3 rounded-lg border ${selectedCenter?.id === c.id ? "border-eco-primary bg-eco-primary/5" : "border-border hover:bg-muted/30"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {c.address}
                        </div>
                        {c.recycling_type && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {c.recycling_type.slice(0, 4).map((t) => (
                              <Badge
                                key={t}
                                variant="outline"
                                className="text-[10px]"
                              >
                                {t}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c.distance ? `${c.distance.toFixed(1)} km` : ""}
                      </div>
                    </div>
                  </button>
                ))}
                {searching && (
                  <div className="text-sm text-muted-foreground">
                    Searching…
                  </div>
                )}
              </div>
              <div className="mt-3 flex justify-between">
                {selectedCenter && location && (
                  <a
                    href={getDirectionsUrl(location, selectedCenter.location)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-eco-primary underline"
                  >
                    Directions
                  </a>
                )}
                <div className="flex-1" />
                <Button
                  disabled={!selectedCenter}
                  onClick={() => setStep(3)}
                  className="bg-gradient-to-r from-eco-primary to-eco-secondary text-white"
                >
                  Next
                </Button>
              </div>
            </div>

            <div
              className={`rounded-xl p-4 border ${step === 3 ? "border-eco-primary" : "border-border"} ${step < 3 ? "opacity-50 pointer-events-none" : ""}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step > 3 ? "bg-eco-primary text-white" : "bg-muted"}`}
                >
                  {step > 3 ? "✓" : "3"}
                </div>
                <div className="font-medium">QR Code Verification</div>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Scan center QR code to confirm drop-off. Use mock input for now.
              </p>
              <div className="relative">
                <Input
                  placeholder="Enter QR code value"
                  value={qrCodeValue}
                  onChange={(e) => setQrCodeValue(e.target.value)}
                  className="pr-24"
                />
                <Button
                  onClick={handleVerifyQR}
                  disabled={verifying || !qrCodeValue}
                  className="absolute right-1 top-1 h-8 px-3 bg-gradient-to-r from-eco-primary to-eco-secondary text-white"
                >
                  {verifying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <QrCode className="w-4 h-4 mr-1" /> Verify
                    </>
                  )}
                </Button>
              </div>
              {verified && (
                <div className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" /> QR
                  verified successfully. Points awarded.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {step === 4 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-3">🎉</div>
              <div className="text-xl font-semibold mb-1">
                You recycled successfully!
              </div>
              <div className="text-muted-foreground">+10 points earned.</div>
              <div className="mt-4">
                <Button onClick={() => setStep(1)} variant="outline">
                  Start New Assessment
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default Assessment;
