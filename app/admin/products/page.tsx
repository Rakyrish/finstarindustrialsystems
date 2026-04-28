"use client";

import { useEffect, useState } from "react";
import { getAdminProducts, getAdminCategories, deleteAdminProduct, type ApiProduct, type ApiCategory } from "@/lib/api";
import Image from "next/image";
import { ProductForm } from "@/components/admin/ProductForm";
import { useToast } from "@/components/admin/Toast";

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
);

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
);

function TableSkeleton() {
  return (
    <div className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-white/5">
          <div className="h-10 w-10 rounded-lg bg-slate-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 bg-slate-800 rounded" />
            <div className="h-3 w-20 bg-slate-800 rounded" />
          </div>
          <div className="h-6 w-16 bg-slate-800 rounded-lg" />
          <div className="h-6 w-16 bg-slate-800 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export default function ProductsPage() {
  const { addToast } = useToast();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<ApiProduct | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const [prodsData, catsData] = await Promise.all([
        getAdminProducts(),
        getAdminCategories()
      ]);
      setProducts(prodsData.results || []);
      setCategories(catsData || []);
    } catch {
      setError("Failed to load products.");
      addToast("Failed to load products", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to deactivate this product?")) return;

    try {
      await deleteAdminProduct(id);
      addToast("Product deactivated successfully", "success");
      fetchData();
    } catch {
      addToast("Failed to delete product", "error");
    }
  };

  const handleAddNew = () => {
    setEditProduct(null);
    setShowForm(true);
  };

  const handleEdit = (product: ApiProduct) => {
    setEditProduct(product);
    setShowForm(true);
  };

  const handleFormSave = () => {
    setShowForm(false);
    setEditProduct(null);
    fetchData();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditProduct(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Products</h2>
          <p className="text-sm text-slate-400 mt-1">Manage your inventory and catalog</p>
        </div>
        {!showForm && (
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer"
          >
            <PlusIcon /> Add Product
          </button>
        )}
      </div>

      {showForm && (
        <ProductForm
          categories={categories}
          product={editProduct}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      )}

      {!showForm && (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-sm">
          {error ? (
            <div className="p-6 text-red-500">{error}</div>
          ) : loading ? (
            <TableSkeleton />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-900/50 text-slate-300 font-medium">
                  <tr>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/50 transition">
                      <td className="px-6 py-4 flex items-center gap-4">
                        <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-slate-900 border border-white/10">
                          {p.image_url ? (
                            <div className="relative h-full w-full">
                              <Image src={p.image_url} alt={p.name} fill className="object-cover" sizes="40px" />
                            </div>
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-600 text-xs">No img</div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-white">{p.name}</div>
                          {p.featured && <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">Featured</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg text-xs font-medium">
                          {p.category?.name || "None"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {p.is_active ? (
                          <span className="inline-flex items-center gap-1.5 text-green-400 bg-green-400/10 px-2.5 py-1 rounded-lg text-xs font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-slate-400 bg-slate-400/10 px-2.5 py-1 rounded-lg text-xs font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(p)}
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                            title="Edit product"
                          >
                            <EditIcon />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition cursor-pointer"
                            title="Deactivate product"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-16 text-center text-slate-400">
                        No products found. Add some to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
