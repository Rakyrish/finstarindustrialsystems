"use client";

import { useState } from "react";
import { uploadAdminImage, createAdminProduct, updateAdminProduct, generateProductWithAI, type ApiCategory, type ApiProduct } from "@/lib/api";
import Image from "next/image";
import { useToast } from "@/components/admin/Toast";

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
);

const LinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
);

const ImageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
);

const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /><path d="M20 3v4" /><path d="M22 5h-4" /></svg>
);

type ImageMode = "upload" | "url";

export function ProductForm({ categories, product, onSave, onCancel }: { categories: ApiCategory[], product?: ApiProduct | null, onSave: () => void, onCancel: () => void }) {
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    name: product?.name || "",
    short_description: product?.short_description || "",
    description: product?.description || "",
    category_id: product?.category?.id || (categories.length > 0 ? categories[0].id : ""),
    featured: product?.featured || false,
    is_active: product?.is_active ?? true,
    image_url: product?.image_url || "",
  });

  const [imageMode, setImageMode] = useState<ImageMode>("upload");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(product?.image_url || "");
  const [urlInput, setUrlInput] = useState(product?.image_url || "");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setUrlInput(""); // Clear URL if switching to file
    }
  };

  const handleUrlChange = (url: string) => {
    setUrlInput(url);
    setImageFile(null); // Clear file if switching to URL
    if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
      setImagePreview(url);
      setFormData({ ...formData, image_url: url });
    } else {
      setImagePreview("");
    }
  };

  const hasImageInput = !!(imageFile || (urlInput && urlInput.startsWith("https://")));

  const handleAIGenerate = async () => {
    if (!hasImageInput) {
      addToast("Upload an image or paste a URL first.", "error");
      return;
    }

    setAiLoading(true);
    setError("");

    try {
      const input = imageFile || urlInput;
      const aiData = await generateProductWithAI(input);

      setFormData(prev => ({
        ...prev,
        name: aiData.name,
        short_description: aiData.short_description,
        description: aiData.description,
      }));

      addToast("Product details generated successfully!", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "AI generation failed. Please try again.";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category_id) return;

    setLoading(true);
    setError("");

    try {
      let finalImageUrl = formData.image_url;

      if (imageMode === "upload" && imageFile) {
        const uploadRes = await uploadAdminImage(imageFile);
        finalImageUrl = uploadRes.image_url;
      } else if (imageMode === "url" && urlInput) {
        finalImageUrl = urlInput;
      }

      if (!finalImageUrl && !product) {
        throw new Error("An image is required for new products.");
      }

      const payload = {
        ...formData,
        image_url: finalImageUrl
      };

      if (product) {
        await updateAdminProduct(product.id, payload);
        addToast("Product updated successfully!", "success");
      } else {
        await createAdminProduct(payload);
        addToast("Product created successfully!", "success");
      }

      onSave(); // Trigger refresh on parent
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred during save.";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-xl dark:shadow-2xl mb-8">
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
        {product ? "Edit Product" : "Add New Product"}
      </h3>

      {error && <div className="mb-6 text-sm text-red-600 dark:text-red-500 bg-red-50 dark:bg-red-500/10 p-4 rounded-xl border border-red-200 dark:border-red-500/20">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Section with Mode Toggle */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Product Image {!product && <span className="text-red-500">*</span>}</label>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setImageMode("upload")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${imageMode === "upload"
                ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30"
                : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white"
                }`}
            >
              <ImageIcon /> Upload File in the system
            </button>
            <button
              type="button"
              onClick={() => setImageMode("url")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${imageMode === "url"
                ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30"
                : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white"
                }`}
            >
              <LinkIcon /> Paste URLs
            </button>
          </div>

          <div className="flex items-start gap-6">
            {imagePreview ? (
              <div className="relative w-24 h-24 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-slate-100 dark:bg-slate-950 shrink-0">
                <Image src={imagePreview} alt="Preview" fill className="object-cover" sizes="96px" />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-xl border border-dashed border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-slate-950 shrink-0 flex items-center justify-center text-slate-400 dark:text-slate-600">
                <UploadIcon />
              </div>
            )}

            <div className="flex-1">
              {imageMode === "upload" ? (
                <>
                  <input
                    type="file"
                    accept="image/jpeg, image/png, image/webp"
                    onChange={handleImageChange}
                    className="block w-full text-sm text-slate-600 dark:text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-orange-500 file:text-white hover:file:bg-orange-600 transition outline-none cursor-pointer"
                  />
                  <p className="text-xs text-slate-500 mt-2">JPG, PNG or WEBP. Max 5MB.</p>
                </>
              ) : (
                <>
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={urlInput}
                    onChange={e => handleUrlChange(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-orange-500 outline-none transition"
                  />
                  <p className="text-xs text-slate-500 mt-2">Paste a direct URL to an image (must be HTTPS)</p>
                </>
              )}
            </div>
          </div>

          {/* AI Generate Button */}
          <div className="mt-4">
            <button
              type="button"
              onClick={handleAIGenerate}
              disabled={!hasImageInput || aiLoading || loading}
              className="group flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30"
            >
              {aiLoading ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                  <span>Generating product details...</span>
                </>
              ) : (
                <>
                  <SparklesIcon />
                  <span>Generate with AI</span>
                </>
              )}
            </button>
            {!hasImageInput && (
              <p className="text-xs text-slate-500 mt-2">Upload an image or paste a URL above to enable AI generation.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Name <span className="text-red-500">*</span></label>
            <input
              required
              type="text"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-orange-500 outline-none transition"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Category <span className="text-red-500">*</span></label>
            <select
              required
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-orange-500 outline-none transition appearance-none"
              value={formData.category_id}
              onChange={e => setFormData({ ...formData, category_id: parseInt(e.target.value) })}
            >
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Short Description</label>
          <input
            type="text"
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-orange-500 outline-none transition"
            value={formData.short_description}
            onChange={e => setFormData({ ...formData, short_description: e.target.value })}
            placeholder="Brief summary for product cards..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Detailed Description</label>
          <textarea
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-orange-500 outline-none transition resize-none"
            rows={4}
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="flex items-center gap-6 border-t border-slate-200 dark:border-white/10 pt-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-slate-300 dark:border-white/20 bg-white dark:bg-slate-950 text-orange-500 focus:ring-orange-500 focus:ring-offset-white dark:focus:ring-offset-slate-950"
              checked={formData.is_active}
              onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Active (Visible)</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-slate-300 dark:border-white/20 bg-white dark:bg-slate-950 text-orange-500 focus:ring-orange-500 focus:ring-offset-white dark:focus:ring-offset-slate-950"
              checked={formData.featured}
              onChange={e => setFormData({ ...formData, featured: e.target.checked })}
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Featured Product</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-white/10">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition disabled:opacity-50 cursor-pointer flex items-center justify-center min-w-[120px]"
          >
            {loading ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
            ) : (
              "Save Product"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
