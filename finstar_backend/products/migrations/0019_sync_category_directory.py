# Syncs the DB `Category` rows with the frontend's `categoryDirectory`
# (lib/data.ts) so every category the site links to in nav/footer/search
# actually exists as a real, admin-manageable row — not just a
# frontend-only placeholder that 404s into a "coming soon" page.
#
#   - Renames the existing "boilers" category slug to "boilers-steam-systems"
#     to match the site's nav/footer link (which pointed at a slug that
#     didn't exist in the DB, silently breaking that link).
#   - Creates the 16 categories that only ever existed as frontend
#     placeholders, using the exact name/description/icon already shown
#     on the public site.

from django.db import migrations

NEW_CATEGORIES = [
    ("mechanical-ventilation", "Mechanical Ventilation", "Industrial-grade ventilation systems for commercial and large-scale applications.", "💨"),
    ("industrial-burners-accessories", "Industrial Burners & Accessories", "Industrial-grade burners and accessories for various industrial applications.", "🔥"),
    ("insulation-materials", "Insulation Materials", "Industrial-grade insulation materials for thermal and acoustic insulation.", "🛡️"),
    ("plumbing-fabrication", "Plumbing & Fabrication", "Plumbing systems, custom fabrication, and pipework solutions for commercial and industrial buildings.", "🔧"),
    ("pipe-fittings-metals", "Pipe Fittings & Metals", "Copper, steel, and PVC pipe fittings, flanges, elbows, and metal fabrication components.", "🪛"),
    ("valves-flow-control", "Valves & Flow Control", "Ball valves, gate valves, check valves, and flow control equipment for industrial pipework systems.", "🔩"),
    ("pumps-fluids", "Pumps & Fluids", "Centrifugal, submersible, and industrial pumps for water, chemicals, and fluid handling.", "💧"),
    ("brass-fittings", "Brass Fittings", "High-quality brass fittings for plumbing and industrial applications.", "🔩"),
    ("stainless-steel-products", "Stainless Steel Products", "Food-grade and industrial stainless steel tanks, vessels, fittings, and custom fabrications.", "⚙️"),
    ("refrigeration-oils", "Refrigeration Oils", "High-performance refrigeration oils for industrial refrigeration systems.", "💧"),
    ("industrial-equipment-supplies", "Industrial Equipment & Supplies", "General-purpose industrial machinery, tools, and consumable supplies.", "🏭"),
    ("laboratory-specialized-equipment", "Laboratory & Specialized Equipment", "Precision laboratory instruments, calibration tools, and specialized equipment.", "🔬"),
    ("castor-wheels", "Castor Wheels", "Heavy-duty castor wheels for industrial mobility and equipment handling.", "⚙️"),
    ("construction-installation-materials", "Construction & Installation Materials", "Structural materials, insulation panels, fasteners, and installation hardware.", "🏗️"),
    ("services", "Services", "Installation, commissioning, preventive maintenance, and emergency breakdown support.", "🛠️"),
    ("miscellaneous", "Miscellaneous", "Other industrial products and equipment not covered by standard categories.", "📦"),
]

OLD_BOILERS_SLUG = "boilers"
NEW_BOILERS_SLUG = "boilers-steam-systems"


def sync_forward(apps, schema_editor):
    Category = apps.get_model("products", "Category")

    Category.objects.filter(slug=OLD_BOILERS_SLUG).update(slug=NEW_BOILERS_SLUG)

    for slug, name, description, icon in NEW_CATEGORIES:
        Category.objects.get_or_create(
            slug=slug, defaults={"name": name, "description": description, "icon": icon},
        )


def sync_reverse(apps, schema_editor):
    Category = apps.get_model("products", "Category")

    Category.objects.filter(
        slug__in=[slug for slug, *_ in NEW_CATEGORIES], products__isnull=True,
    ).delete()

    Category.objects.filter(slug=NEW_BOILERS_SLUG).update(slug=OLD_BOILERS_SLUG)


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0018_seoregenerationjob_auto_publish_and_more"),
    ]

    operations = [
        migrations.RunPython(sync_forward, sync_reverse),
    ]
