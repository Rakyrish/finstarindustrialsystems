import { CategoryLink, Service } from "@/types";

// ── Category directory: single source of truth for all frontend category metadata ──
// Slugs must be URL-safe (lowercase, hyphens only, no spaces or parens).
// The category page falls back to this data when a slug isn't yet in the backend DB.
export const categoryDirectory: Record<
  string,
  Pick<CategoryLink, "name" | "description" | "icon">
> = {
  // ── Refrigeration & Cooling ──────────────────────────────────────────────────
  refrigeration: {
    name: "Industrial Refrigeration",
    description: "Industrial refrigeration systems, cold storage components, and commercial cooling equipment.",
    icon: "❄️",
  },
  hvac: {
    name: "HVAC Systems",
    description: "HVAC systems, air conditioning equipment, ventilation solutions, and climate control products.",
    icon: "🌬️",
  },
  "cold-rooms": {
    name: "Cold Rooms",
    description: "Cold room equipment, cold storage products, insulation panels, and refrigeration accessories.",
    icon: "🧊",
  },
  "mechanical-ventilation": {
    name: "Mechanical Ventilation",
    description: "Industrial-grade ventilation systems for commercial and large-scale applications.",
    icon: "💨",
  },

  // ── Boilers & Heating ────────────────────────────────────────────────────────
  "boilers-steam-systems": {
    name: "Boilers & Steam Systems",
    description: "High-efficiency industrial boilers, steam generators, and steam distribution systems.",
    icon: "🔥",
  },
  "industrial-burners-accessories": {
    name: "Industrial Burners & Accessories",
    description: "Industrial-grade burners and accessories for various industrial applications.",
    icon: "🔥",
  },
  "insulation-materials": {
    name: "Insulation Materials",
    description: "Industrial-grade insulation materials for thermal and acoustic insulation.",
    icon: "🛡️",
  },

  // ── Pipes, Fittings & Flow ───────────────────────────────────────────────────
  "plumbing-fabrication": {
    name: "Plumbing & Fabrication",
    description: "Plumbing systems, custom fabrication, and pipework solutions for commercial and industrial buildings.",
    icon: "🔧",
  },
  "pipe-fittings-metals": {
    name: "Pipe Fittings & Metals",
    description: "Copper, steel, and PVC pipe fittings, flanges, elbows, and metal fabrication components.",
    icon: "🪛",
  },
  "valves-flow-control": {
    name: "Valves & Flow Control",
    description: "Ball valves, gate valves, check valves, and flow control equipment for industrial pipework systems.",
    icon: "🔩",
  },
  "pumps-fluids": {
    name: "Pumps & Fluids",
    description: "Centrifugal, submersible, and industrial pumps for water, chemicals, and fluid handling.",
    icon: "💧",
  },
  "brass-fittings": {
    name: "Brass Fittings",
    description: "High-quality brass fittings for plumbing and industrial applications.",
    icon: "🔩",
  },

  // ── Materials & Specialist Equipment ────────────────────────────────────────
  "stainless-steel-products": {
    name: "Stainless Steel Products",
    description: "Food-grade and industrial stainless steel tanks, vessels, fittings, and custom fabrications.",
    icon: "⚙️",
  },
  "refrigeration-oils": {
    name: "Refrigeration Oils",
    description: "High-performance refrigeration oils for industrial refrigeration systems.",
    icon: "💧",
  },
  "industrial-equipment-supplies": {
    name: "Industrial Equipment & Supplies",
    description: "General-purpose industrial machinery, tools, and consumable supplies.",
    icon: "🏭",
  },
  "laboratory-specialized-equipment": {
    name: "Laboratory & Specialized Equipment",
    description: "Precision laboratory instruments, calibration tools, and specialized equipment.",
    icon: "🔬",
  },
  "castor-wheels": {
    name: "Castor Wheels",
    description: "Heavy-duty castor wheels for industrial mobility and equipment handling.",
    icon: "⚙️",
  },
  "construction-installation-materials": {
    name: "Construction & Installation Materials",
    description: "Structural materials, insulation panels, fasteners, and installation hardware.",
    icon: "🏗️",
  },
  fittings: {
    name: "Industrial Fittings",
    description: "Industrial fittings, accessories, and support components for refrigeration, HVAC, and plant systems.",
    icon: "🔧",
  },

  // ── Services ─────────────────────────────────────────────────────────────────
  services: {
    name: "Services",
    description: "Installation, commissioning, preventive maintenance, and emergency breakdown support.",
    icon: "🛠️",
  },

  // ── Miscellaneous ─────────────────────────────────────────────────────────────
  miscellaneous: {
    name: "Miscellaneous",
    description: "Other industrial products and equipment not covered by standard categories.",
    icon: "📦",
  },
};

// ── Mega-menu groups: used by the desktop navbar mega menu ───────────────────
export const megaMenuGroups = [
  {
    title: "Refrigeration & Cooling",
    slugs: ["refrigeration", "hvac", "cold-rooms", "mechanical-ventilation"],
  },
  {
    title: "Boilers & Heating",
    slugs: ["boilers-steam-systems", "industrial-burners-accessories", "insulation-materials"],
  },
  {
    title: "Pipes, Fittings & Flow",
    slugs: ["plumbing-fabrication", "pipe-fittings-metals", "valves-flow-control", "pumps-fluids"],
  },
  {
    title: "Materials & Equipment",
    slugs: ["stainless-steel-products", "refrigeration-oils", "industrial-equipment-supplies", "services"],
  },
] as const;

export const navigationCategories: CategoryLink[] = Object.entries(
  categoryDirectory,
).map(([slug, value], index) => ({
  id: `${index + 1}`,
  slug,
  ...value,
}));

export function getCategoryMeta(slug: string) {
  return (
    categoryDirectory[slug] ?? {
      name: slug
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
      description: "Industrial equipment solutions for demanding environments.",
      icon: "⚙️",
    }
  );
}

export function getCategoryIcon(slug: string, icon?: string) {
  return icon || getCategoryMeta(slug).icon;
}

export const services: Service[] = [
  {
    id: "s-1",
    title: "Cold Room Design & Installation",
    description:
      "End-to-end cold room solutions from bespoke design to professional installation, commissioning, and maintenance.",
    icon: "🏭",
  },
  {
    id: "s-2",
    title: "Air Conditioning & HVAC",
    description:
      "Supply, installation, and servicing of split units, ducted systems, VRF, and industrial HVAC solutions.",
    icon: "❄️",
  },
  {
    id: "s-3",
    title: "Industrial Refrigeration",
    description:
      "Turnkey refrigeration projects for food processing, cold storage, pharmaceutical, and logistics industries.",
    icon: "🧊",
  },
  {
    id: "s-4",
    title: "Boiler Systems & Steam",
    description:
      "Supply, installation, and maintenance of fire-tube boilers, steam generators, and steam distribution networks.",
    icon: "🔥",
  },
  {
    id: "s-5",
    title: "Preventive Maintenance",
    description:
      "Scheduled preventive maintenance contracts to keep your systems at peak efficiency and minimise downtime.",
    icon: "🔧",
  },
];
