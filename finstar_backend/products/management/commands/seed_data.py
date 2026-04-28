"""
Management command to seed the database with initial product/category data.

Usage:
    python manage.py seed_data
    python manage.py seed_data --clear   # Clear existing data first
"""

from django.core.management.base import BaseCommand
from products.models import Category, Product


CATEGORIES = [
    {
        "name": "Refrigeration Systems",
        "slug": "refrigeration",
        "description": "Industrial-grade refrigeration units for commercial and large-scale cold storage applications.",
        "icon": "❄️",
    },
    {
        "name": "Air Conditioning & HVAC",
        "slug": "hvac",
        "description": "Complete HVAC solutions for factories, warehouses, offices, and commercial buildings.",
        "icon": "💨",
    },
    {
        "name": "Boilers & Steam Systems",
        "slug": "boilers",
        "description": "High-efficiency industrial boilers and steam distribution systems for process heating.",
        "icon": "🔥",
    },
    {
        "name": "Cold Rooms & Insulation",
        "slug": "cold-rooms",
        "description": "Custom-built cold rooms with premium insulation panels for food, pharma, and logistics.",
        "icon": "🏭",
    },
    {
        "name": "Industrial Fittings & Tools",
        "slug": "fittings",
        "description": "Pipes, valves, gauges, and precision tools for all industrial installation needs.",
        "icon": "🔧",
    },
]

PRODUCTS = [
    # Refrigeration
    {
        "name": "Commercial Scroll Refrigeration Unit",
        "slug": "commercial-scroll-refrigeration-unit",
        "category_slug": "refrigeration",
        "short_description": "High-efficiency scroll compressor unit for commercial cold storage.",
        "description": "The Commercial Scroll Refrigeration Unit delivers unmatched efficiency for large-scale cold storage. Featuring an advanced scroll compressor with variable-speed technology, this unit maintains precise temperature control between -25°C and +15°C. Ideal for supermarkets, warehouses, and food processing plants. Built with corrosion-resistant materials for long service life, it includes digital controls, auto-defrost, and remote monitoring capability.",
        "featured": True,
        "specs": {
            "Cooling Capacity": "10 – 50 kW",
            "Temperature Range": "-25°C to +15°C",
            "Refrigerant": "R-404A / R-134a",
            "Power Supply": "380V / 3-Phase / 50Hz",
            "Warranty": "2 Years",
        },
    },
    {
        "name": "Walk-In Freezer Condensing Unit",
        "slug": "walk-in-freezer-condensing-unit",
        "category_slug": "refrigeration",
        "short_description": "Robust condensing unit designed for walk-in freezer applications.",
        "description": "Engineered for demanding freezer room environments, this condensing unit offers reliable operation in ambient temperatures up to 43°C. The heavy-duty housing protects against dust and moisture, while the hermetic compressor ensures leak-free performance. Comes pre-charged and tested for quick commissioning.",
        "featured": True,
        "specs": {
            "Cooling Capacity": "3 – 15 kW",
            "Temperature Range": "-30°C to -18°C",
            "Refrigerant": "R-404A",
            "Power Supply": "220V / 1-Phase or 380V / 3-Phase",
            "Warranty": "18 Months",
        },
    },
    {
        "name": "Evaporator Coil Unit – Industrial Grade",
        "slug": "evaporator-coil-unit-industrial-grade",
        "category_slug": "refrigeration",
        "short_description": "High-capacity evaporator for large commercial refrigeration systems.",
        "description": "Our industrial-grade evaporator coil units are built with high-grade aluminium fins and copper tubing for maximum heat transfer efficiency. Available in single, dual, and multi-fan configurations. Suitable for blast freezers, dairy storage, and meat processing facilities.",
        "featured": False,
        "specs": {
            "Capacity": "5 – 40 kW",
            "Fins": "Aluminium (Epoxy-coated available)",
            "Tubing": "Copper",
            "Fans": "EC Fan Motor",
            "Warranty": "2 Years",
        },
    },
    # HVAC
    {
        "name": "Ducted Split Air Conditioner – 36,000 BTU",
        "slug": "ducted-split-air-conditioner-36000-btu",
        "category_slug": "hvac",
        "short_description": "Concealed ducted split system for seamless commercial installations.",
        "description": "The 36,000 BTU Ducted Split Air Conditioner provides silent, even cooling through concealed ductwork. Featuring inverter technology for up to 40% energy savings, this unit is perfect for office buildings, hotels, and large showrooms. Includes a smart thermostat, timer, and optional Wi-Fi control module.",
        "featured": True,
        "specs": {
            "Capacity": "36,000 BTU (10.5 kW)",
            "SEER": "18",
            "Refrigerant": "R-32",
            "External Static Pressure": "Up to 50 Pa",
            "Noise Level": "< 32 dB(A)",
            "Warranty": "3 Years",
        },
    },
    {
        "name": "Industrial Rooftop Package Unit",
        "slug": "industrial-rooftop-package-unit",
        "category_slug": "hvac",
        "short_description": "Self-contained rooftop packaged HVAC system for industrial facilities.",
        "description": "This self-contained rooftop unit combines cooling, heating, and ventilation in a single weatherproof enclosure. Designed for flat-roof industrial buildings, it offers 5-25 ton capacity range with options for electric heating or gas burner. Easy installation, minimal interior space requirement, and full remote monitoring capability.",
        "featured": True,
        "specs": {
            "Cooling Capacity": "15 – 88 kW (5 – 25 ton)",
            "Heating Options": "Electric / Gas",
            "Refrigerant": "R-410A",
            "Airflow": "2,000 – 10,000 CFM",
            "Warranty": "2 Years",
        },
    },
    {
        "name": "VRF Multi-Zone System",
        "slug": "vrf-multi-zone-system",
        "category_slug": "hvac",
        "short_description": "Variable Refrigerant Flow system for multi-zone climate control.",
        "description": "Our VRF (Variable Refrigerant Flow) system allows simultaneous heating and cooling in different zones from a single outdoor unit. Supporting up to 64 indoor units per system, it's ideal for hotels, hospitals, offices, and shopping malls. Comes with a centralised BMS interface for energy management.",
        "featured": False,
        "specs": {
            "Capacity": "8 – 56 HP",
            "Max Indoor Units": "64",
            "Refrigerant": "R-410A",
            "Piping": "Up to 165m total / 90m height diff",
            "Warranty": "3 Years",
        },
    },
    # Boilers
    {
        "name": "Fire-Tube Steam Boiler – 2,000 kg/h",
        "slug": "fire-tube-steam-boiler-2000-kgh",
        "category_slug": "boilers",
        "short_description": "Robust fire-tube boiler for continuous industrial steam production.",
        "description": "Our fire-tube steam boiler is built to ASME standards and delivers consistent steam output for industrial processes including textile, food processing, and chemical industries. Equipped with a fully automated burner control, automatic water-level management, and safety relief valves. The insulated shell minimises heat loss and operating costs.",
        "featured": True,
        "specs": {
            "Steam Output": "2,000 kg/h",
            "Working Pressure": "Up to 16 bar",
            "Fuel": "Gas / Diesel / Dual-Fuel",
            "Efficiency": "> 92%",
            "Certification": "ASME / CE",
            "Warranty": "2 Years",
        },
    },
    {
        "name": "Electric Steam Generator",
        "slug": "electric-steam-generator",
        "category_slug": "boilers",
        "short_description": "Clean, compact electric steam generator for process applications.",
        "description": "Ideal for facilities where gas is unavailable, this electric steam generator produces instant clean steam with zero combustion emissions. Available in 6 kW to 144 kW output. Simple controls, wall-mounted design, and optional water softener integration make this a versatile solution for laboratories, food production, and hospitals.",
        "featured": False,
        "specs": {
            "Steam Output": "Up to 180 kg/h",
            "Power Range": "6 – 144 kW",
            "Working Pressure": "Up to 10 bar",
            "Fuel": "Electric",
            "Warranty": "2 Years",
        },
    },
    # Cold Rooms
    {
        "name": "Modular Cold Room – Chiller (0°C to +4°C)",
        "slug": "modular-cold-room-chiller-0c-to-4c",
        "category_slug": "cold-rooms",
        "short_description": "Fully modular chiller room with PIR insulation panels for food storage.",
        "description": "Our modular chiller cold rooms use 100mm PIR insulation panels with cam-lock joints for fast, tool-free assembly. The airtight construction maintains a consistent 0°C to +4°C environment, ideal for fruits, vegetables, dairy, and meat. Each unit includes a high-performance monoblock refrigeration system, anti-condensate door heater, and LED lighting.",
        "featured": True,
        "specs": {
            "Temperature": "0°C to +4°C",
            "Panel Thickness": "100mm PIR",
            "Floor Load": "Up to 1,500 kg/m²",
            "Door Options": "Hinged / Sliding / Strip Curtain",
            "Warranty": "2 Years",
        },
    },
    {
        "name": "Blast Freezer Room (-30°C to -18°C)",
        "slug": "blast-freezer-room-30c-to-18c",
        "category_slug": "cold-rooms",
        "short_description": "High-performance blast freeze room for rapid product freezing.",
        "description": "Designed for rapid product blast-freezing, this room uses high-velocity airflow and powerful refrigeration to drop product core temperature from +70°C to -18°C in under 4 hours. Constructed with 150mm thick PIR panels, reinforced floor, and high-capacity evaporators. Available in standard sizes or custom dimensions.",
        "featured": False,
        "specs": {
            "Temperature": "-30°C to -18°C",
            "Panel Thickness": "150mm PIR",
            "Pull-Down Time": "< 4 hours (+70°C to -18°C)",
            "Airflow": "High-Velocity (3 – 5 m/s)",
            "Warranty": "2 Years",
        },
    },
    # Fittings & Tools
    {
        "name": "Copper Fittings Kit – Refrigeration Grade",
        "slug": "copper-fittings-kit-refrigeration-grade",
        "category_slug": "fittings",
        "short_description": "Premium dehydrated copper fittings for refrigeration and HVAC piping.",
        "description": 'This comprehensive copper fittings kit includes elbows, tees, adapters, unions, and reducers in sizes 1/4" to 4". All fittings are phosphorus-deoxidized copper, individually dehydrated, and sealed to prevent oxidation. Suitable for R-410A, R-32, R-134a, and all common refrigerants.',
        "featured": False,
        "specs": {
            "Material": "Dehydrated Copper",
            "Sizes": '1/4" – 4"',
            "Compatibility": "All Common Refrigerants",
            "Standard": "ASTM B280",
            "Warranty": "1 Year",
        },
    },
    {
        "name": "Digital Manifold Gauge Set",
        "slug": "digital-manifold-gauge-set",
        "category_slug": "fittings",
        "short_description": "Professional 4-valve digital manifold for HVAC/R diagnostics.",
        "description": "This professional-grade digital manifold gauge set features a colour LCD display showing high/low side pressures, saturation temperatures, superheat, subcooling, and pH values simultaneously. Compatible with 60+ refrigerants. The 4-valve design enables precise refrigerant recovery, evacuation, and charging without hose swapping.",
        "featured": False,
        "specs": {
            "Refrigerant Database": "60+ Refrigerants",
            "Display": "Colour LCD",
            "Accuracy": "±0.5%",
            "Pressure Range": "-30 inHg to 800 PSI",
            "Connectivity": "Bluetooth (App Compatible)",
            "Warranty": "1 Year",
        },
    },
]


class Command(BaseCommand):
    help = "Seed database with initial FINSTAR product and category data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing products and categories before seeding.",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write("Clearing existing data...")
            Product.objects.all().delete()
            Category.objects.all().delete()

        # Create categories
        category_map = {}
        for cat_data in CATEGORIES:
            cat, created = Category.objects.get_or_create(
                slug=cat_data["slug"],
                defaults={
                    "name": cat_data["name"],
                    "description": cat_data["description"],
                    "icon": cat_data["icon"],
                },
            )
            category_map[cat_data["slug"]] = cat
            status_str = "Created" if created else "Already exists"
            self.stdout.write(f"  {status_str}: {cat.name}")

        # Create products
        for prod_data in PRODUCTS:
            category = category_map[prod_data["category_slug"]]
            product, created = Product.objects.get_or_create(
                slug=prod_data["slug"],
                defaults={
                    "name": prod_data["name"],
                    "description": prod_data["description"],
                    "short_description": prod_data.get("short_description", ""),
                    "category": category,
                    "featured": prod_data.get("featured", False),
                    "specs": prod_data.get("specs", {}),
                },
            )
            status_str = "Created" if created else "Already exists"
            self.stdout.write(f"  {status_str}: {product.name}")

        self.stdout.write(self.style.SUCCESS(
            f"\nSeeding complete! {Category.objects.count()} categories, "
            f"{Product.objects.count()} products."
        ))
