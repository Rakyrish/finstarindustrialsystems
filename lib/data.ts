import { Category, Product, Service } from "@/types";

export const categories: Category[] = [
  {
    id: "1",
    name: "Refrigeration Systems",
    slug: "refrigeration",
    description:
      "Industrial-grade refrigeration units for commercial and large-scale cold storage applications.",
    icon: "❄️",
    productCount: 8,
  },
  {
    id: "2",
    name: "Air Conditioning & HVAC",
    slug: "hvac",
    description:
      "Complete HVAC solutions for factories, warehouses, offices, and commercial buildings.",
    icon: "💨",
    productCount: 12,
  },
  {
    id: "3",
    name: "Boilers & Steam Systems",
    slug: "boilers",
    description:
      "High-efficiency industrial boilers and steam distribution systems for process heating.",
    icon: "🔥",
    productCount: 6,
  },
  {
    id: "4",
    name: "Cold Rooms & Insulation",
    slug: "cold-rooms",
    description:
      "Custom-built cold rooms with premium insulation panels for food, pharma, and logistics.",
    icon: "🏭",
    productCount: 9,
  },
  {
    id: "5",
    name: "Industrial Fittings & Tools",
    slug: "fittings",
    description:
      "Pipes, valves, gauges, and precision tools for all industrial installation needs.",
    icon: "🔧",
    productCount: 24,
  },
];

export const products: Product[] = [
  // Refrigeration
  {
    id: "r-001",
    name: "Commercial Scroll Refrigeration Unit",
    category: "refrigeration",
    image: "/images/products/scroll-ref.jpg",
    shortDescription: "High-efficiency scroll compressor unit for commercial cold storage.",
    description:
      "The Commercial Scroll Refrigeration Unit delivers unmatched efficiency for large-scale cold storage. Featuring an advanced scroll compressor with variable-speed technology, this unit maintains precise temperature control between -25°C and +15°C. Ideal for supermarkets, warehouses, and food processing plants. Built with corrosion-resistant materials for long service life, it includes digital controls, auto-defrost, and remote monitoring capability.",
    featured: true,
    specs: {
      "Cooling Capacity": "10 – 50 kW",
      "Temperature Range": "-25°C to +15°C",
      Refrigerant: "R-404A / R-134a",
      "Power Supply": "380V / 3-Phase / 50Hz",
      Warranty: "2 Years",
    },
  },
  {
    id: "r-002",
    name: "Walk-In Freezer Condensing Unit",
    category: "refrigeration",
    image: "/images/products/freezer-unit.jpg",
    shortDescription: "Robust condensing unit designed for walk-in freezer applications.",
    description:
      "Engineered for demanding freezer room environments, this condensing unit offers reliable operation in ambient temperatures up to 43°C. The heavy-duty housing protects against dust and moisture, while the hermetic compressor ensures leak-free performance. Comes pre-charged and tested for quick commissioning.",
    featured: true,
    specs: {
      "Cooling Capacity": "3 – 15 kW",
      "Temperature Range": "-30°C to -18°C",
      Refrigerant: "R-404A",
      "Power Supply": "220V / 1-Phase or 380V / 3-Phase",
      Warranty: "18 Months",
    },
  },
  {
    id: "r-003",
    name: "Evaporator Coil Unit – Industrial Grade",
    category: "refrigeration",
    image: "/images/products/evaporator.jpg",
    shortDescription: "High-capacity evaporator for large commercial refrigeration systems.",
    description:
      "Our industrial-grade evaporator coil units are built with high-grade aluminium fins and copper tubing for maximum heat transfer efficiency. Available in single, dual, and multi-fan configurations. Suitable for blast freezers, dairy storage, and meat processing facilities.",
    featured: false,
    specs: {
      Capacity: "5 – 40 kW",
      Fins: "Aluminium (Epoxy-coated available)",
      Tubing: "Copper",
      Fans: "EC Fan Motor",
      Warranty: "2 Years",
    },
  },
  // HVAC
  {
    id: "h-001",
    name: "Ducted Split Air Conditioner – 36,000 BTU",
    category: "hvac",
    image: "/images/products/ducted-split.jpg",
    shortDescription: "Concealed ducted split system for seamless commercial installations.",
    description:
      "The 36,000 BTU Ducted Split Air Conditioner provides silent, even cooling through concealed ductwork. Featuring inverter technology for up to 40% energy savings, this unit is perfect for office buildings, hotels, and large showrooms. Includes a smart thermostat, timer, and optional Wi-Fi control module.",
    featured: true,
    specs: {
      Capacity: "36,000 BTU (10.5 kW)",
      SEER: "18",
      Refrigerant: "R-32",
      "External Static Pressure": "Up to 50 Pa",
      "Noise Level": "< 32 dB(A)",
      Warranty: "3 Years",
    },
  },
  {
    id: "h-002",
    name: "Industrial Rooftop Package Unit",
    category: "hvac",
    image: "/images/products/rooftop-unit.jpg",
    shortDescription: "Self-contained rooftop packaged HVAC system for industrial facilities.",
    description:
      "This self-contained rooftop unit combines cooling, heating, and ventilation in a single weatherproof enclosure. Designed for flat-roof industrial buildings, it offers 5-25 ton capacity range with options for electric heating or gas burner. Easy installation, minimal interior space requirement, and full remote monitoring capability.",
    featured: true,
    specs: {
      "Cooling Capacity": "15 – 88 kW (5 – 25 ton)",
      "Heating Options": "Electric / Gas",
      Refrigerant: "R-410A",
      Airflow: "2,000 – 10,000 CFM",
      Warranty: "2 Years",
    },
  },
  {
    id: "h-003",
    name: "VRF Multi-Zone System",
    category: "hvac",
    image: "/images/products/vrf-system.jpg",
    shortDescription: "Variable Refrigerant Flow system for multi-zone climate control.",
    description:
      "Our VRF (Variable Refrigerant Flow) system allows simultaneous heating and cooling in different zones from a single outdoor unit. Supporting up to 64 indoor units per system, it's ideal for hotels, hospitals, offices, and shopping malls. Comes with a centralised BMS interface for energy management.",
    featured: false,
    specs: {
      Capacity: "8 – 56 HP",
      "Max Indoor Units": "64",
      Refrigerant: "R-410A",
      Piping: "Up to 165m total / 90m height diff",
      Warranty: "3 Years",
    },
  },
  // Boilers
  {
    id: "b-001",
    name: "Fire-Tube Steam Boiler – 2,000 kg/h",
    category: "boilers",
    image: "/images/products/fire-tube-boiler.jpg",
    shortDescription: "Robust fire-tube boiler for continuous industrial steam production.",
    description:
      "Our fire-tube steam boiler is built to ASME standards and delivers consistent steam output for industrial processes including textile, food processing, and chemical industries. Equipped with a fully automated burner control, automatic water-level management, and safety relief valves. The insulated shell minimises heat loss and operating costs.",
    featured: true,
    specs: {
      "Steam Output": "2,000 kg/h",
      "Working Pressure": "Up to 16 bar",
      Fuel: "Gas / Diesel / Dual-Fuel",
      Efficiency: "> 92%",
      Certification: "ASME / CE",
      Warranty: "2 Years",
    },
  },
  {
    id: "b-002",
    name: "Electric Steam Generator",
    category: "boilers",
    image: "/images/products/electric-steam.jpg",
    shortDescription: "Clean, compact electric steam generator for process applications.",
    description:
      "Ideal for facilities where gas is unavailable, this electric steam generator produces instant clean steam with zero combustion emissions. Available in 6 kW to 144 kW output. Simple controls, wall-mounted design, and optional water softener integration make this a versatile solution for laboratories, food production, and hospitals.",
    featured: false,
    specs: {
      "Steam Output": "Up to 180 kg/h",
      "Power Range": "6 – 144 kW",
      "Working Pressure": "Up to 10 bar",
      Fuel: "Electric",
      Warranty: "2 Years",
    },
  },
  // Cold Rooms
  {
    id: "c-001",
    name: "Modular Cold Room – Chiller (0°C to +4°C)",
    category: "cold-rooms",
    image: "/images/products/cold-room-chiller.jpg",
    shortDescription: "Fully modular chiller room with PIR insulation panels for food storage.",
    description:
      "Our modular chiller cold rooms use 100mm PIR insulation panels with cam-lock joints for fast, tool-free assembly. The airtight construction maintains a consistent 0°C to +4°C environment, ideal for fruits, vegetables, dairy, and meat. Each unit includes a high-performance monoblock refrigeration system, anti-condensate door heater, and LED lighting.",
    featured: true,
    specs: {
      Temperature: "0°C to +4°C",
      "Panel Thickness": "100mm PIR",
      "Floor Load": "Up to 1,500 kg/m²",
      "Door Options": "Hinged / Sliding / Strip Curtain",
      Warranty: "2 Years",
    },
  },
  {
    id: "c-002",
    name: "Blast Freezer Room (-30°C to -18°C)",
    category: "cold-rooms",
    image: "/images/products/blast-freezer-room.jpg",
    shortDescription: "High-performance blast freeze room for rapid product freezing.",
    description:
      "Designed for rapid product blast-freezing, this room uses high-velocity airflow and powerful refrigeration to drop product core temperature from +70°C to -18°C in under 4 hours. Constructed with 150mm thick PIR panels, reinforced floor, and high-capacity evaporators. Available in standard sizes or custom dimensions.",
    featured: false,
    specs: {
      Temperature: "-30°C to -18°C",
      "Panel Thickness": "150mm PIR",
      "Pull-Down Time": "< 4 hours (+70°C to -18°C)",
      Airflow: "High-Velocity (3 – 5 m/s)",
      Warranty: "2 Years",
    },
  },
  // Fittings & Tools
  {
    id: "f-001",
    name: "Copper Fittings Kit – Refrigeration Grade",
    category: "fittings",
    image: "/images/products/copper-fittings.jpg",
    shortDescription: "Premium dehydrated copper fittings for refrigeration and HVAC piping.",
    description:
      "This comprehensive copper fittings kit includes elbows, tees, adapters, unions, and reducers in sizes 1/4\" to 4\". All fittings are phosphorus-deoxidized copper, individually dehydrated, and sealed to prevent oxidation. Suitable for R-410A, R-32, R-134a, and all common refrigerants.",
    featured: false,
    specs: {
      Material: "Dehydrated Copper",
      Sizes: "1/4\" – 4\"",
      Compatibility: "All Common Refrigerants",
      Standard: "ASTM B280",
      Warranty: "1 Year",
    },
  },
  {
    id: "f-002",
    name: "Digital Manifold Gauge Set",
    category: "fittings",
    image: "/images/products/manifold-gauge.jpg",
    shortDescription: "Professional 4-valve digital manifold for HVAC/R diagnostics.",
    description:
      "This professional-grade digital manifold gauge set features a colour LCD display showing high/low side pressures, saturation temperatures, superheat, subcooling, and pH values simultaneously. Compatible with 60+ refrigerants. The 4-valve design enables precise refrigerant recovery, evacuation, and charging without hose swapping.",
    featured: false,
    specs: {
      "Refrigerant Database": "60+ Refrigerants",
      Display: "Colour LCD",
      Accuracy: "±0.5%",
      "Pressure Range": "-30 inHg to 800 PSI",
      Connectivity: "Bluetooth (App Compatible)",
      Warranty: "1 Year",
    },
  },
];

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
    icon: "💨",
  },
  {
    id: "s-3",
    title: "Industrial Refrigeration",
    description:
      "Turnkey refrigeration projects for food processing, cold storage, pharmaceutical, and logistics industries.",
    icon: "❄️",
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

export const getProductById = (id: string): Product | undefined =>
  products.find((p) => p.id === id);

export const getProductsByCategory = (slug: string): Product[] =>
  products.filter((p) => p.category === slug);

export const getFeaturedProducts = (): Product[] =>
  products.filter((p) => p.featured);

export const getCategoryBySlug = (slug: string): Category | undefined =>
  categories.find((c) => c.slug === slug);

export const getRelatedProducts = (product: Product, limit = 3): Product[] =>
  products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, limit);
