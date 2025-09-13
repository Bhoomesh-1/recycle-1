// src/lib/ml-integration.ts
import { useCallback, useEffect, useState } from "react";

export type ClassificationResult = {
  type: "biodegradable" | "recyclable" | "hazardous";
  confidence: number; // percent 0-100
  processingTime?: number; // ms
};

/**
 * Classify an image file by calling the backend /predict endpoint.
 * Backend default: https://recycling-hub-model-backend-1.onrender.com/predict
 * Expected backend response shape:
 *   { class: string, confidence: number (0..1), processingTime?: number }
 */
export async function classifyWaste(file: File): Promise<ClassificationResult> {
  // Priority: VITE env (client), NEXT_PUBLIC env (SSR), fallback to the Render URL provided
  const API_URL =
    (import.meta as any)?.env?.VITE_ML_API_ENDPOINT ||
    (typeof process !== "undefined" &&
      (process as any)?.env?.NEXT_PUBLIC_BACKEND_URL) ||
    "https://recycling-hub-model-backend-1.onrender.com/predict";

  const formData = new FormData();
  formData.append("file", file);

  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();

  const res = await fetch(API_URL, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Prediction failed (${res.status}): ${text || res.statusText}`,
    );
  }

  const data = await res.json();

  // expected: data.class (string), data.confidence (0..1)
  const backendClass: string = data?.class ?? "";
  const backendConfidence: number = Number(data?.confidence ?? 0);

  const mappedType = mapBackendClass(backendClass);

  const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();

  return {
    type: mappedType,
    confidence: Math.round(
      (isNaN(backendConfidence) ? 0 : backendConfidence) * 100,
    ),
    processingTime: Math.round(t1 - t0),
  };
}

/**
 * Map backend class names to client types.
 * Adjust this mapping if your backend returns different labels.
 */
function mapBackendClass(predicted: string): ClassificationResult["type"] {
  const key = (predicted || "").toLowerCase().trim();
  switch (key) {
    case "organic":
    case "biodegradable":
      return "biodegradable";
    case "recyclable":
    case "recycle":
      return "recyclable";
    case "hazardous":
    case "non-recyclable":
      return "hazardous";
    default:
      // fallback to recyclable for unknown labels
      return "recyclable";
  }
}

/**
 * Client-side validation for images accepted for classification.
 */
export function validateImageForClassification(file: File) {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return {
      isValid: false,
      error: "Only JPG, PNG or WEBP images are allowed.",
    };
  }
  // 5 MB limit
  if (file.size > 5 * 1024 * 1024) {
    return { isValid: false, error: "File size must be under 5MB." };
  }
  return { isValid: true, error: null as null | string };
}

/**
 * React hook wrapper used by pages (provides loading + modelReady).
 */
export function useWasteClassification() {
  const [loading, setLoading] = useState(false);
  const [modelReady, setModelReady] = useState(true);

  // Could be extended to ping the model endpoint for real readiness
  useEffect(() => {
    setModelReady(true);
  }, []);

  const classify = useCallback(async (file: File) => {
    setLoading(true);
    try {
      return await classifyWaste(file);
    } finally {
      setLoading(false);
    }
  }, []);

  return { classifyWaste: classify, loading, modelReady };
}
