import { CategoryLink, Service } from "@/types";

export const categoryDirectory: Record<
  string,
  Pick<CategoryLink, "name" | "description" | "icon">
> = {
  "refrigeration-air-conditioning-hvac": {
    name: "Refrigeration ",
    description:
      "Industrial-grade refrigeration units, split systems, VRF, and complete HVAC solutions for commercial and large-scale applications.",
    icon: "❄️",
  },

  "boilers-steam-systems": {
    name: "Boilers & Steam Systems",
    description:
      "High-efficiency industrial boilers, steam generators, and steam distribution systems for process heating.",
    icon: "🔥",
  },

  "pumps-fluids": {
    name: "Pumps & Fluids",
    description:
      "Centrifugal, submersible, and industrial pumps for water, chemicals, and fluid handling applications.",
    icon: "💧",
  },

  "valves-flow-control": {
    name: "Valves & Flow Control",
    description:
      "Ball valves, gate valves, check valves, and flow control equipment for industrial pipework systems.",
    icon: "🔩",
  },

  "pipe-fittings-metals": {
    name: "Pipe Fittings & Metals",
    description:
      "Copper, steel, and PVC pipe fittings, flanges, elbows, and metal fabrication components.",
    icon: "🪛",
  },

  "industrial-equipment-supplies": {
    name: "Industrial Equipment & Supplies",
    description:
      "General-purpose industrial machinery, tools, and consumable supplies for manufacturing and operations.",
    icon: "🏭",
  },

  "construction-installation-materials": {
    name: "Construction & Installation Materials",
    description:
      "Structural materials, insulation panels, fasteners, and installation hardware for industrial construction.",
    icon: "🏗️",
  },

  "plumbing-fabrication": {
    name: "Plumbing & Fabrication",
    description:
      "Plumbing systems, custom fabrication, and pipework solutions for commercial and industrial buildings.",
    icon: "🔧",
  },

  "laboratory-specialized-equipment": {
    name: "Laboratory & Specialized Equipment",
    description:
      "Precision laboratory instruments, calibration tools, and specialized equipment for technical environments.",
    icon: "🔬",
  },

  "stainless-steel-products": {
    name: "Stainless Steel Products",
    description:
      "Food-grade and industrial stainless steel tanks, vessels, fittings, and custom fabrications.",
    icon: "⚙️",
  },

  "mechanical-ventilation": {
    name: "Mechanical Ventilation",
    description:
      "Industrial-grade ventilation systems for commercial and large-scale applications.",
    icon: "🌬️",
  },

  "brass-fittings": {
    name: "Brass Fittings",
    description:
      "High-quality brass fittings for plumbing and industrial applications.",
    icon: "🔩",
  },

  "insulation-materials": {
    name: "Insulation Materials",
    description:
      "Industrial-grade insulation materials for thermal and acoustic insulation.",
    icon: "🛡️",
  },

  "refrigeration-oils": {
    name: "Refrigeration Oils",
    description:
      "High-performance refrigeration oils for industrial refrigeration systems.",
    icon: "💧",
  },

  "industrial-burners-accessories": {
    name: "Industrial Burners & Accessories",
    description:
      "Industrial-grade burners and accessories for various industrial applications.",
    icon: "🔥",
  },

  "castor-wheels": {
    name: "Castor Wheels",
    description:
      "Heavy-duty castor wheels for industrial mobility and equipment handling.",
    icon: "⚙️",
  },

  services: {
    name: "Services",
    description:
      "Installation, commissioning, preventive maintenance, and emergency breakdown support services.",
    icon: "🛠️",
  },
  "Air Conditioning (HVAC)": {
    name: "Air Conditioning (HVAC)",
    description:
      "Supply, installation, and servicing of split units, ducted systems, VRF, and industrial HVAC solutions.",
    icon: "❄️",
  },

  miscellaneous: {
    name: "Miscellaneous",
    description:
      "Other industrial products and equipment not covered by standard categories.",
    icon: "📦",
  },

};

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
  {
    id: "s-6",
    title: "Emergency Breakdown Support",
    description:
      "24/7 emergency call-out service for rapid diagnosis and repair of critical refrigeration and HVAC systems.",
    icon: "⚡",
  },
];