"""
Management command to safely backfill Product.brand from existing text data.

This is deliberately conservative: it only sets `brand` when a known
distributor brand name appears as an unambiguous case-insensitive substring
match in the product's name or specs values. It never guesses, fuzzy-matches,
or asks an LLM to infer a brand — every value it writes is traceable back to
literal text that was already on the product.

Usage:
    python manage.py backfill_product_brands --dry-run
    python manage.py backfill_product_brands
"""

from django.core.management.base import BaseCommand
from products.models import Product


# Known distributor brands — same list shown on the public homepage brand strip
# (see app/page.tsx `brands` array). Kept here as the single source of truth
# for this command; if the homepage list changes, update both.
KNOWN_BRANDS = [
    "Riello",
    "Secop",
    "Baite",
    "Spirax",
    "Suniso",
    "Emkarate",
    "Nu Way",
    "Baltur",
    "Danfoss",
    "Gree",
    "LG",
    "Maxron",
    "Westron",
    "Maksal",
    "Autoflame",
    "John Thompson",
]


class Command(BaseCommand):
    help = "Backfill Product.brand via conservative substring matching against known distributor brands."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would change without writing to the database.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        matched = 0
        ambiguous = 0
        skipped = 0

        products = Product.objects.filter(brand="")
        total = products.count()

        for product in products:
            haystack = " ".join(
                [product.name] + [str(v) for v in (product.specs or {}).values()]
            ).lower()

            hits = [brand for brand in KNOWN_BRANDS if brand.lower() in haystack]

            if len(hits) == 1:
                brand = hits[0]
                matched += 1
                self.stdout.write(f"  MATCH  #{product.id} \"{product.name}\" -> {brand}")
                if not dry_run:
                    product.brand = brand
                    product.save(update_fields=["brand"])
            elif len(hits) > 1:
                ambiguous += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"  AMBIGUOUS  #{product.id} \"{product.name}\" matched {hits} — left blank for manual review"
                    )
                )
            else:
                skipped += 1

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"{'[DRY RUN] ' if dry_run else ''}"
                f"{total} unbranded products scanned: "
                f"{matched} matched and {'would be ' if dry_run else ''}backfilled, "
                f"{ambiguous} ambiguous (left blank), "
                f"{skipped} no match (left blank for manual review)."
            )
        )
