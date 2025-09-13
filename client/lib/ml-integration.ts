// src/lib/ml-integration.ts
import { useCallback, useEffect, useState } from "react";

export type ClassificationResult = {
  type: "biodegradable" | "recyclable" | "hazardous";
  confidence: number; // percent 0-100
  processingTime?: number; // ms
};

/**
 * Classify an image file by calling the backend /predict endpoint.
 * Expects backend response: { class: string, confidence: float(0..1), processingTime: ms }
 */
export async function classifyWaste(file: File): Promise<ClassificationResult> {
  const API_URL =
    (import.meta as any).env?.VITE_ML_API_ENDPOINT ||
    (typeof process !== "undefined" &&
      (process as any)?.env?.NEXT_PUBLIC_BACKEND_URL) ||
    "http://localhost:8000/predict"; // local fallback for dev

  const formData = new FormData();
  formData.append("file", file);

  const t0 = performance.now();

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
  const backendClass: string = data.class;
  const backendConfidence: number = Number(data.confidence);

  const mappedType = mapBackendClass(backendClass);

  const t1 = performance.now();

  return {
    type: mappedType,
    confidence: Math.round(
      (isNaN(backendConfidence) ? 0 : backendConfidence) * 100,
    ),
    processingTime: Math.round(t1 - t0),
  };
}

function mapBackendClass(predicted: string): ClassificationResult["type"] {
  const key = (predicted || "").toLowerCase().trim();
  switch (key) {
    case "organic":
      return "biodegradable";
    case "recyclable":
      return "recyclable";
    case "hazardous":
      return "hazardous";
    case "non-recyclable":
      return "hazardous";
    default:
      return "recyclable";
  }
}

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

// React hook wrapper used by pages (provides loading + modelReady)
export function useWasteClassification() {
  const [loading, setLoading] = useState(false);
  const [modelReady, setModelReady] = useState(true);

  // In future, we could ping the model endpoint to set readiness
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
