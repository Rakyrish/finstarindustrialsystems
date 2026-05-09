import { useState, useEffect, useCallback } from "react";
import type { SavedProduct } from "@/types";

const STORAGE_KEY = "finstar_saved_products";

function readStorage(): SavedProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedProduct[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(products: SavedProduct[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch {
    // Storage full or disabled — silently ignore
  }
}

export function useSavedProducts() {
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([]);
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage after mount (SSR-safe)
  useEffect(() => {
    setSavedProducts(readStorage());
    setMounted(true);
  }, []);

  const saveProduct = useCallback((product: Omit<SavedProduct, "savedAt">) => {
    setSavedProducts((prev) => {
      if (prev.some((p) => p.id === product.id)) return prev;
      const next: SavedProduct[] = [
        { ...product, savedAt: new Date().toISOString() },
        ...prev,
      ];
      writeStorage(next);
      return next;
    });
  }, []);

  const removeProduct = useCallback((id: number) => {
    setSavedProducts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      writeStorage(next);
      return next;
    });
  }, []);

  const toggleProduct = useCallback(
    (product: Omit<SavedProduct, "savedAt">) => {
      setSavedProducts((prev) => {
        const exists = prev.some((p) => p.id === product.id);
        const next: SavedProduct[] = exists
          ? prev.filter((p) => p.id !== product.id)
          : [{ ...product, savedAt: new Date().toISOString() }, ...prev];
        writeStorage(next);
        return next;
      });
    },
    [],
  );

  const isProductSaved = useCallback(
    (id: number) => savedProducts.some((p) => p.id === id),
    [savedProducts],
  );

  const clearAll = useCallback(() => {
    setSavedProducts([]);
    writeStorage([]);
  }, []);

  return {
    savedProducts,
    // Show 0 on server to avoid hydration mismatch
    savedCount: mounted ? savedProducts.length : 0,
    saveProduct,
    removeProduct,
    toggleProduct,
    isProductSaved,
    clearAll,
    mounted,
  };
}
