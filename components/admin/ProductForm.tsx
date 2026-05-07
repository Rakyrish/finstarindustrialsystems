"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { message } from "antd";
import Image from "next/image";
import ProductDescription from "@/components/ProductDescription";
import { useToast } from "@/components/admin/Toast";
import {
  createAdminProduct,
  generateProductWithAI,
  type ApiCategory,
  type ApiProduct,
  updateAdminProduct,
  uploadAdminImage,
} from "@/lib/api";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

type ImageMode = "upload" | "url";
type DescriptionMode = "preview" | "html";

// ─── Scoped styles (shared between preview and editable mode) ─────────────────
const FPC_STYLES = `
  .fpc {
    font-family: inherit;
    color: inherit;
    line-height: 1.75;
    font-size: 0.95rem;
  }
  .fpc h2 {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #ea580c, #f97316);
    color: #fff;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.5rem 1.1rem;
    border-radius: 0.45rem;
    margin-top: 2rem;
    margin-bottom: 1rem;
    max-width: 100%;
  }
  .fpc h2:first-child { margin-top: 0; }
  .fpc p {
    margin-bottom: 1rem;
    font-size: 0.95rem;
    line-height: 1.8;
    color: #475569;
  }
  .dark .fpc p { color: #94a3b8; }
  .fpc ul {
    list-style: none;
    padding: 0;
    margin: 0 0 1.5rem 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .fpc ul li {
    display: grid;
    grid-template-columns: 8px auto 1fr;
    column-gap: 0.55rem;
    align-items: baseline;
    font-size: 0.93rem;
    color: #475569;
    line-height: 1.7;
  }
  .dark .fpc ul li { color: #94a3b8; }
  .fpc ul li::before {
    content: "";
    display: block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background-color: #f97316;
    align-self: start;
    margin-top: 0.52rem;
    flex-shrink: 0;
  }
  .fpc ul li strong {
    color: #0f172a;
    font-weight: 700;
    white-space: nowrap;
    line-height: 1.7;
  }
  .dark .fpc ul li strong { color: #f1f5f9; }
  .fpc ul li span {
    color: #475569;
    line-height: 1.7;
  }
  .dark .fpc ul li span { color: #94a3b8; }
  @media (max-width: 640px) {
    .fpc ul { gap: 0.75rem; }
    .fpc ul li {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 3px solid #f97316;
      border-radius: 0.5rem;
      padding: 0.7rem 0.85rem;
    }
    .dark .fpc ul li {
      background: #1e293b;
      border-color: #334155;
      border-left-color: #f97316;
    }
    .fpc ul li::before { display: none; }
    .fpc ul li strong {
      display: block;
      white-space: normal;
      font-size: 0.9rem;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.4;
    }
    .dark .fpc ul li strong { color: #f1f5f9; }
    .fpc ul li span {
      display: block;
      font-size: 0.875rem;
      color: #64748b;
      line-height: 1.65;
      white-space: normal;
    }
    .dark .fpc ul li span { color: #94a3b8; }
    .fpc p { font-size: 0.9rem; line-height: 1.75; }
    .fpc h2 {
      font-size: 0.75rem;
      padding: 0.45rem 0.85rem;
      width: 100%;
      border-radius: 0.4rem;
    }
  }
  .fpc .table-wrap {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    border-radius: 0.75rem;
    box-shadow: 0 1px 6px rgba(0,0,0,0.08);
    margin-bottom: 1.75rem;
  }
  .fpc table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
    min-width: 280px;
  }
  .fpc table thead tr {
    background: #1e293b;
    color: #f1f5f9;
  }
  .fpc table th {
    padding: 0.7rem 0.9rem;
    text-align: left;
    font-weight: 700;
    font-size: 0.75rem;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .fpc table td {
    padding: 0.65rem 0.9rem;
    vertical-align: top;
    border-bottom: 1px solid #e2e8f0;
    color: #334155;
    line-height: 1.6;
  }
  .fpc table td:first-child {
    font-weight: 600;
    color: #0f172a;
    white-space: nowrap;
    width: 38%;
  }
  .fpc table tbody tr:nth-child(odd)  { background-color: #f8fafc; }
  .fpc table tbody tr:nth-child(even) { background-color: #ffffff; }
  .fpc table tbody tr:last-child td   { border-bottom: none; }
  .dark .fpc table thead tr           { background: #0f172a; }
  .dark .fpc table td                 { color: #cbd5e1; border-bottom-color: #1e293b; }
  .dark .fpc table td:first-child     { color: #f1f5f9; }
  .dark .fpc table tbody tr:nth-child(odd)  { background-color: #1e293b; }
  .dark .fpc table tbody tr:nth-child(even) { background-color: #0f172a; }
  @media (max-width: 640px) {
    .fpc table td:first-child { white-space: normal; width: auto; }
    .fpc table th, .fpc table td { padding: 0.5rem 0.65rem; font-size: 0.82rem; }
  }
  .fpc dl { margin: 0 0 1.5rem 0; }
  .fpc dt {
    font-weight: 700;
    color: #0f172a;
    font-size: 0.93rem;
    margin-top: 1rem;
    margin-bottom: 0.25rem;
  }
  .dark .fpc dt { color: #f1f5f9; }
  .fpc dd {
    color: #475569;
    font-size: 0.9rem;
    line-height: 1.7;
    margin-left: 0;
    padding-left: 1rem;
    border-left: 3px solid #f97316;
  }
  .dark .fpc dd { color: #94a3b8; }
  .fpc a {
    color: #f97316;
    font-weight: 600;
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: border-color 0.15s;
  }
  .fpc a:hover { border-bottom-color: #f97316; }
`;

// ─── Icons ────────────────────────────────────────────────────────────────────

function UploadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidHttpsUrl(value: string) {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// ─── Editable Product Description ────────────────────────────────────────────

function EditableProductDescription({
  content,
  onChange,
}: {
  content: string;
  onChange: (html: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastContentRef = useRef<string>(content);
  const isComposingRef = useRef(false);
  const isFocusedRef = useRef(false);
  const prevContentRef = useRef(content);

  // Set initial HTML on mount only
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = content;
      lastContentRef.current = content;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync when parent pushes new content (e.g. AI re-generation)
  // but never interrupt an active edit session
  useEffect(() => {
    if (prevContentRef.current === content) return;
    prevContentRef.current = content;

    if (isFocusedRef.current) return;
    if (!containerRef.current) return;

    containerRef.current.innerHTML = content;
    lastContentRef.current = content;
  }, [content]);

  const handleInput = useCallback(() => {
    if (isComposingRef.current) return;
    if (!containerRef.current) return;
    const nextHtml = containerRef.current.innerHTML;
    if (nextHtml !== lastContentRef.current) {
      lastContentRef.current = nextHtml;
      onChange(nextHtml);
    }
  }, [onChange]);

  return (
    <div className="relative rounded-2xl border border-orange-200 bg-white transition-all dark:border-orange-500/30 dark:bg-slate-950">
      <style dangerouslySetInnerHTML={{ __html: FPC_STYLES }} />

      {/* Editable badge */}
      <div className="pointer-events-none absolute right-3 top-3 z-10 flex select-none items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 dark:border-orange-500/30 dark:bg-orange-500/10">
        <span className="text-orange-500"><PencilIcon /></span>
        <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400">
          Editable
        </span>
      </div>

      {/* Content editable area */}
      <div
        ref={containerRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onCompositionStart={() => { isComposingRef.current = true; }}
        onCompositionEnd={() => {
          isComposingRef.current = false;
          handleInput();
        }}
        onFocus={() => { isFocusedRef.current = true; }}
        onBlur={() => {
          isFocusedRef.current = false;
          handleInput(); // final sync on blur
        }}
        spellCheck
        className="fpc min-h-[200px] max-h-[560px] overflow-y-auto rounded-t-2xl px-5 pb-5 pt-5 outline-none focus-within:ring-2 focus-within:ring-orange-400 focus-within:ring-inset [&_dd]:cursor-text [&_dt]:cursor-text [&_h2]:cursor-text [&_li]:cursor-text [&_p]:cursor-text [&_td]:cursor-text"
      />

      {/* Bottom hint bar */}
      <div className="flex items-center gap-2 rounded-b-2xl border-t border-slate-100 px-4 py-2.5 dark:border-white/5">
        <span className="shrink-0 text-slate-400"><InfoIcon /></span>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Click any text to edit it directly. Tables, lists, and formatting are preserved.
          Switch to <strong className="font-semibold text-slate-500 dark:text-slate-400">HTML</strong> mode for structural changes.
        </p>
      </div>
    </div>
  );
}

// ─── ProductForm ──────────────────────────────────────────────────────────────

export function ProductForm({
  categories,
  product,
  onSave,
  onCancel,
}: {
  categories: ApiCategory[];
  product?: ApiProduct | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    name: product?.name ?? "",
    short_description: product?.short_description ?? "",
    description: product?.description ?? "",
    category_id: product?.category?.id ?? categories[0]?.id ?? 0,
    featured: product?.featured ?? false,
    is_active: product?.is_active ?? true,
    image_url: product?.image_url ?? "",
  });

  const [imageMode, setImageMode] = useState<ImageMode>(
    product?.image_url ? "url" : "upload",
  );
  const [descriptionMode, setDescriptionMode] = useState<DescriptionMode>(
    product?.description ? "preview" : "html",
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(product?.image_url ?? "");
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState(product?.image_url ?? "");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");

  // Revoke object URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    };
  }, [previewObjectUrl]);

  function updatePreview(nextPreview: string, nextObjectUrl?: string | null) {
    if (previewObjectUrl && previewObjectUrl !== nextObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
    }
    setPreviewObjectUrl(nextObjectUrl ?? null);
    setImagePreview(nextPreview);
  }

  function pushError(nextError: string) {
    setError(nextError);
    addToast(nextError, "error");
    message.error(nextError);
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      pushError("Unsupported image type. Use JPG, PNG, WEBP, or AVIF.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      pushError("Image is too large. Maximum size is 5MB.");
      event.target.value = "";
      return;
    }

    setError("");
    setImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    updatePreview(objectUrl, objectUrl);
  }

  function handleUrlChange(value: string) {
    setUrlInput(value);
    setError("");

    if (isValidHttpsUrl(value)) {
      updatePreview(value.trim());
      setFormData((prev) => ({ ...prev, image_url: value.trim() }));
      return;
    }
    updatePreview("");
  }

  const currentModeHasImage =
    imageMode === "upload" ? Boolean(imageFile) : isValidHttpsUrl(urlInput);

  async function handleAIGenerate() {
    if (!currentModeHasImage) {
      pushError("Provide an image file or a valid HTTPS image URL first.");
      return;
    }

    setAiLoading(true);
    setError("");

    try {
      const aiData = await generateProductWithAI({
        image: imageMode === "upload" && imageFile ? imageFile : urlInput.trim(),
      });

      setFormData((prev) => ({
        ...prev,
        name: aiData.name,
        short_description: aiData.short_description,
        description: aiData.description,
      }));
      setDescriptionMode("preview");
      addToast("Product details generated successfully.", "success");
      message.success("Product details generated successfully.");
    } catch (err: unknown) {
      pushError(
        err instanceof Error ? err.message : "AI generation failed. Please try again.",
      );
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit() {
    const trimmedName = formData.name.trim();
    if (!trimmedName) { pushError("Product name is required."); return; }
    if (!formData.category_id) { pushError("Select a category before saving."); return; }

    setLoading(true);
    setError("");

    try {
      let finalImageUrl = formData.image_url;

      if (imageMode === "upload" && imageFile) {
        const uploadResult = await uploadAdminImage(imageFile);
        finalImageUrl = uploadResult.image_url;
      }

      if (imageMode === "url") {
        if (!urlInput.trim()) {
          finalImageUrl = product?.image_url ?? "";
        } else if (!isValidHttpsUrl(urlInput)) {
          throw new Error("Image URL must start with https://");
        } else {
          finalImageUrl = urlInput.trim();
        }
      }

      if (!product && !finalImageUrl) {
        throw new Error("An image is required when creating a new product.");
      }

      const payload = {
        ...formData,
        name: trimmedName,
        short_description: formData.short_description.trim(),
        description: formData.description.trim(),
        image_url: finalImageUrl,
      };

      if (product) {
        await updateAdminProduct(product.id, payload);
        addToast("Product updated successfully.", "success");
        message.success("Product updated successfully.");
      } else {
        await createAdminProduct(payload);
        addToast("Product created successfully.", "success");
        message.success("Product created successfully.");
      }

      onSave();
    } catch (err: unknown) {
      pushError(
        err instanceof Error ? err.message : "An error occurred while saving the product.",
      );
    } finally {
      setLoading(false);
    }
  }

  const showDescriptionToggle = formData.description.trim().length > 0;

  return (
    <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-slate-900 dark:shadow-2xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-2 border-b border-slate-200 pb-6 dark:border-white/10">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          {product ? "Edit Product" : "Add New Product"}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Manage product details, image source, and AI-generated copy from one place.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-6">

        {/* ── Image Section ─────────────────────────────────────────────────── */}
        <div>
          <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Product Image {!product && <span className="text-red-500">*</span>}
          </label>

          {/* Mode toggle */}
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setImageMode("upload")}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${imageMode === "upload"
                  ? "border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-400"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 dark:border-white/10 dark:bg-slate-950 dark:text-slate-400 dark:hover:text-white"
                }`}
            >
              <ImageIcon /> Upload File
            </button>
            <button
              onClick={() => setImageMode("url")}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${imageMode === "url"
                  ? "border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-400"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 dark:border-white/10 dark:bg-slate-950 dark:text-slate-400 dark:hover:text-white"
                }`}
            >
              <LinkIcon /> Paste URL
            </button>
          </div>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
            {/* Preview thumbnail */}
            {imagePreview ? (
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-950">
                <Image src={imagePreview} alt="Product preview" fill className="object-cover" sizes="96px" />
              </div>
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-400 dark:border-white/20 dark:bg-slate-950 dark:text-slate-600">
                <UploadIcon />
              </div>
            )}

            <div className="flex-1 space-y-3">
              {imageMode === "upload" ? (
                <div>
                  <input
                    type="file"
                    accept="image/jpg,image/jpeg,image/png,image/webp,image/avif"
                    onChange={handleImageChange}
                    className="block w-full cursor-pointer text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-orange-500 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-orange-600 dark:text-slate-400"
                  />
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    JPG, JPEG, PNG, WEBP, or AVIF. Maximum size: 5MB.
                  </p>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://example.com/product-image.webp"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-orange-500 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                  />
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Paste a direct HTTPS image URL. Non-HTTPS links will be rejected.
                  </p>
                </div>
              )}

              {/* AI Generate button */}
              <button
                onClick={handleAIGenerate}
                disabled={!currentModeHasImage || aiLoading || loading}
                className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {aiLoading ? (
                  <><SpinnerIcon /><span>Generating product details...</span></>
                ) : (
                  <><SparklesIcon /><span>Generate with AI</span></>
                )}
              </button>

              {!currentModeHasImage && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Add an image source above to enable AI generation.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Name & Category ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-orange-500 dark:border-white/10 dark:bg-slate-950 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData((prev) => ({ ...prev, category_id: Number(e.target.value) }))}
              className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-orange-500 dark:border-white/10 dark:bg-slate-950 dark:text-white"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Short Description ─────────────────────────────────────────────── */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Short Description
          </label>
          <input
            type="text"
            value={formData.short_description}
            onChange={(e) => setFormData((prev) => ({ ...prev, short_description: e.target.value }))}
            placeholder="Brief summary for product cards..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-orange-500 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>

        {/* ── Detailed Description ──────────────────────────────────────────── */}
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Detailed Description
            </label>

            {showDescriptionToggle && (
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-slate-950">
                <button
                  onClick={() => setDescriptionMode("preview")}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${descriptionMode === "preview"
                      ? "bg-orange-500 text-white"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                >
                  ✏️ Preview & Edit
                </button>
                <button
                  onClick={() => setDescriptionMode("html")}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${descriptionMode === "html"
                      ? "bg-orange-500 text-white"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                >
                  {"</>"} HTML
                </button>
              </div>
            )}
          </div>

          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            {descriptionMode === "preview"
              ? "Click anywhere in the content below to edit it directly. All changes are synced automatically."
              : "Edit the raw HTML. Switch to Preview & Edit to see and modify the formatted output."}
          </p>

          {descriptionMode === "preview" && showDescriptionToggle ? (
            <EditableProductDescription
              content={formData.description}
              onChange={(nextHtml) =>
                setFormData((prev) => ({ ...prev, description: nextHtml }))
              }
            />
          ) : (
            <textarea
              rows={12}
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="AI-generated HTML will appear here, or write your own..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-900 outline-none transition focus:border-orange-500 dark:border-white/10 dark:bg-slate-950 dark:text-white"
            />
          )}
        </div>

        {/* ── Visibility toggles ────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-6 border-t border-slate-200 pt-6 dark:border-white/10">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
              className="h-5 w-5 rounded border-slate-300 text-orange-500 focus:ring-orange-500 dark:border-white/20 dark:bg-slate-950"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Active</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={formData.featured}
              onChange={(e) => setFormData((prev) => ({ ...prev, featured: e.target.checked }))}
              className="h-5 w-5 rounded border-slate-300 text-orange-500 focus:ring-orange-500 dark:border-white/20 dark:bg-slate-950"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Featured</span>
          </label>
        </div>

        {/* ── Actions ───────────────────────────────────────────────────────── */}
        <div className="flex justify-end gap-3 border-t border-slate-200 pt-6 dark:border-white/10">
          <button
            onClick={onCancel}
            disabled={loading || aiLoading}
            className="rounded-2xl px-6 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || aiLoading}
            className="flex min-w-[140px] items-center justify-center rounded-2xl bg-orange-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <SpinnerIcon /> : "Save Product"}
          </button>
        </div>
      </div>
    </div>
  );
}