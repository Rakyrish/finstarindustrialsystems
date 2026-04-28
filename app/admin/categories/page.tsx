"use client";

import { useEffect, useState } from "react";
import { getAdminCategories, createAdminCategory, deleteAdminCategory, type ApiCategory } from "@/lib/api";
import { useToast } from "@/components/admin/Toast";

const FolderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /></svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
);

// ─── Preset category definitions ─────────────────────────────────────────────
const PRESET_CATEGORIES = [
  {
    name: "Refrigeration",
    description: "Industrial-grade refrigeration units, split systems, VRF, and complete HVAC solutions for commercial and large-scale applications.",
    icon: "❄️",
  },
  {
    name: "Boilers & Steam Systems",
    description: "High-efficiency industrial boilers, steam generators, and steam distribution systems for process heating.",
    icon: "🔥",
  },
  {
    name: "Pumps & Fluids",
    description: "Centrifugal, submersible, and industrial pumps for water, chemicals, and fluid handling applications.",
    icon: "💧",
  },
  {
    name: "Valves & Flow Control",
    description: "Ball valves, gate valves, check valves, and flow control equipment for industrial pipework systems.",
    icon: "🔩",
  },
  {
    name: "Pipe Fittings & Metals",
    description: "Copper, steel, and PVC pipe fittings, flanges, elbows, and metal fabrication components.",
    icon: "🪛",
  },
  {
    name: "Industrial Equipment & Supplies",
    description: "General-purpose industrial machinery, tools, and consumable supplies for manufacturing and operations.",
    icon: "🏭",
  },
  {
    name: "Construction & Installation Materials",
    description: "Structural materials, insulation panels, fasteners, and installation hardware for industrial construction.",
    icon: "🏗️",
  },
  {
    name: "Plumbing & Fabrication",
    description: "Plumbing systems, custom fabrication, and pipework solutions for commercial and industrial buildings.",
    icon: "🔧",
  },
  {
    name: "Laboratory & Specialized Equipment",
    description: "Precision laboratory instruments, calibration tools, and specialized equipment for technical environments.",
    icon: "🔬",
  },
  {
    name: "Stainless Steel Products",
    description: "Food-grade and industrial stainless steel tanks, vessels, fittings, and custom fabrications.",
    icon: "⚙️",
  },
  {
    name: "Services",
    description: "Installation, commissioning, preventive maintenance, and emergency breakdown support services.",
    icon: "🛠️",
  },
  {
    name: "Miscellaneous",
    description: "Other industrial products and equipment not covered by standard categories.",
    icon: "📦",
  },
  {
    name: "Mechanical Ventilation",
    description:
      "Industrial-grade ventilation systems for commercial and large-scale applications.",
    icon: "🌬️",
  },
  {
    name: "Brass Fittings",
    description:
      "High-quality brass fittings for plumbing and industrial applications.",
    icon: "🔩",
  },
  {
    name: "Insulation Materials",
    description:
      "Industrial-grade insulation materials for thermal and acoustic insulation.",
    icon: "🛡️",
  },
  {
    name: "Refrigeration Oils",
    description:
      "High-performance refrigeration oils for industrial refrigeration systems.",
    icon: "💧",
  },
  {
    name: "Industrial Burners & Accessories",
    description:
      "Industrial-grade burners and accessories for various industrial applications.",
    icon: "🔥",
  },
  {
    name: "Castor Wheel",
    description:
      "Heavy-duty castor wheels for industrial mobility and equipment handling.",
    icon: "⚙️",
  },
  {
    name: "Air Conditioning & HVAC",
    description:
      "Supply, installation, and servicing of split units, ducted systems, VRF, and industrial HVAC solutions.",
    icon: "❄️",
  }
] as const;

type CreateMode = "preset" | "custom";

export default function CategoriesPage() {
  const { addToast } = useToast();
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>("preset");

  // Preset mode state
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);

  // Custom mode state
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIcon, setNewIcon] = useState("");

  const [submitLoading, setSubmitLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await getAdminCategories();
      setCategories(data);
    } catch {
      setError("Failed to load categories.");
      addToast("Failed to load categories", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCategories();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setSelectedPreset(null);
    setNewName("");
    setNewDesc("");
    setNewIcon("");
  };

  const handleToggleAdd = () => {
    if (showAdd) {
      resetForm();
    }
    setShowAdd(!showAdd);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    let payload: { name: string; description: string; icon: string };

    if (createMode === "preset") {
      if (selectedPreset === null) {
        addToast("Please select a category type.", "error");
        return;
      }
      const preset = PRESET_CATEGORIES[selectedPreset];
      payload = { name: preset.name, description: preset.description, icon: preset.icon };
    } else {
      if (!newName.trim()) {
        addToast("Category name is required.", "error");
        return;
      }
      payload = { name: newName.trim(), description: newDesc.trim(), icon: newIcon.trim() };
    }

    // Check for duplicate names against already-created categories
    const alreadyExists = categories.some(
      (c) => c.name.toLowerCase() === payload.name.toLowerCase()
    );
    if (alreadyExists) {
      addToast(`"${payload.name}" already exists.`, "error");
      return;
    }

    try {
      setSubmitLoading(true);
      await createAdminCategory(payload);
      resetForm();
      setShowAdd(false);
      addToast("Category created successfully!", "success");
      await fetchCategories();
    } catch {
      addToast("Failed to create category. Ensure the name is unique.", "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string, productCount: number) => {
    if (productCount > 0) {
      addToast(`Cannot delete "${name}" — it has ${productCount} product(s).`, "error");
      return;
    }
    if (!window.confirm(`Delete category "${name}"? This cannot be undone.`)) return;

    try {
      setDeletingId(id);
      await deleteAdminCategory(id);
      addToast(`Category "${name}" deleted`, "success");
      await fetchCategories();
    } catch (err: unknown) {
      const msg = err instanceof Error && "payload" in err 
        ? ((err as { payload: { error?: string } }).payload?.error || "Failed to delete category.")
        : "Failed to delete category.";
      addToast(msg, "error");
    } finally {
      setDeletingId(null);
    }
  };

  // Preset categories not yet created
  const existingNames = new Set(categories.map((c) => c.name.toLowerCase()));
  const availablePresets = PRESET_CATEGORIES.map((p, i) => ({
    ...p,
    index: i,
    alreadyExists: existingNames.has(p.name.toLowerCase()),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Categories</h2>
          <p className="text-sm text-slate-400 mt-1">Manage product categories</p>
        </div>
        <button
          onClick={handleToggleAdd}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer"
        >
          <PlusIcon /> {showAdd ? "Cancel" : "Add Category"}
        </button>
      </div>

      {showAdd && (
        <div className="bg-slate-900/80 border border-white/10 p-6 rounded-2xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Create New Category</h3>
            {/* Mode toggle */}
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg text-sm">
              <button
                type="button"
                onClick={() => { setCreateMode("preset"); resetForm(); }}
                className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${createMode === "preset"
                  ? "bg-orange-500 text-white"
                  : "text-slate-400 hover:text-white"
                  }`}
              >
                From Preset
              </button>
              <button
                type="button"
                onClick={() => { setCreateMode("custom"); resetForm(); }}
                className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${createMode === "custom"
                  ? "bg-orange-500 text-white"
                  : "text-slate-400 hover:text-white"
                  }`}
              >
                Custom
              </button>
            </div>
          </div>

          <form onSubmit={handleCreate} className="space-y-5">
            {createMode === "preset" ? (
              <div>
                <p className="text-sm text-slate-400 mb-3">
                  Select a standard industry category to add to your catalog.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
                  {availablePresets.map((preset) => (
                    <button
                      key={preset.index}
                      type="button"
                      disabled={preset.alreadyExists}
                      onClick={() => setSelectedPreset(preset.index)}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${preset.alreadyExists
                        ? "border-white/5 bg-slate-800/30 opacity-40 cursor-not-allowed"
                        : selectedPreset === preset.index
                          ? "border-orange-500 bg-orange-500/10"
                          : "border-white/10 bg-slate-800/50 hover:border-white/20 hover:bg-slate-800"
                        }`}
                    >
                      <span className="text-2xl shrink-0 mt-0.5">{preset.icon}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white leading-snug">
                          {preset.name}
                          {preset.alreadyExists && (
                            <span className="ml-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                              Added
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {preset.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-orange-500 focus:bg-slate-900 outline-none transition"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Generators"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Icon <span className="text-slate-500 font-normal">(emoji)</span>
                  </label>
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-orange-500 focus:bg-slate-900 outline-none transition"
                    value={newIcon}
                    onChange={(e) => setNewIcon(e.target.value)}
                    placeholder="e.g. ⚡"
                    maxLength={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Description
                  </label>
                  <textarea
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-orange-500 focus:bg-slate-900 outline-none transition resize-none"
                    rows={3}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Brief description about the category"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitLoading || (createMode === "preset" && selectedPreset === null)}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer"
              >
                {submitLoading ? "Saving..." : "Save Category"}
              </button>
              <button
                type="button"
                onClick={handleToggleAdd}
                className="text-slate-400 hover:text-white px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {error ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl">{error}</div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-slate-800" />
                <div className="h-5 w-32 bg-slate-800 rounded" />
              </div>
              <div className="h-4 w-48 bg-slate-800 rounded mb-4" />
              <div className="h-6 w-20 bg-slate-800 rounded-lg" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat: ApiCategory) => {
            const productCount = cat.product_count || 0;
            const canDelete = productCount === 0;

            return (
              <div key={cat.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition flex flex-col gap-4 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-800 p-3 rounded-xl text-orange-500 shrink-0">
                      {cat.icon ? (
                        <span className="text-xl">{cat.icon}</span>
                      ) : (
                        <FolderIcon />
                      )}
                    </div>
                    <h4 className="text-base font-semibold text-white line-clamp-2 leading-snug">{cat.name}</h4>
                  </div>
                  <button
                    onClick={() => handleDelete(cat.id, cat.name, productCount)}
                    disabled={deletingId === cat.id}
                    className={`p-2 rounded-lg transition cursor-pointer shrink-0 ${canDelete
                      ? "text-slate-500 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100"
                      : "text-slate-700 cursor-not-allowed"
                      } ${deletingId === cat.id ? "opacity-50" : ""}`}
                    title={canDelete ? "Delete category" : `Cannot delete — has ${productCount} product(s)`}
                  >
                    <TrashIcon />
                  </button>
                </div>
                <p className="text-sm text-slate-400 flex-1 line-clamp-2">
                  {cat.description || "No description provided."}
                </p>
                <div className="pt-4 border-t border-white/10">
                  <span className="text-xs font-medium text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg inline-block">
                    {productCount} Products
                  </span>
                </div>
              </div>
            );
          })}
          {categories.length === 0 && !loading && (
            <div className="col-span-full py-16 text-center text-slate-400 border border-dashed border-white/20 rounded-2xl">
              No categories found. Click &apos;Add Category&apos; to create one.
            </div>
          )}
        </div>
      )}
    </div>
  );
}