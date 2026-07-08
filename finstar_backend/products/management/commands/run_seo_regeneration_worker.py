import time

from django.core.management.base import BaseCommand

from products.services.seo_bulk import process_pending_seo_jobs


class Command(BaseCommand):
    help = "Process queued bulk AI SEO draft-generation jobs."

    def add_arguments(self, parser):
        parser.add_argument("--once", action="store_true", help="Process available jobs once and exit.")
        parser.add_argument("--batch-size", type=int, default=20, help="Maximum jobs to process per iteration.")
        parser.add_argument("--sleep-seconds", type=float, default=10.0, help="Idle polling interval.")

    def handle(self, *args, **options):
        once = options["once"]
        batch_size = max(1, options["batch_size"])
        sleep_seconds = max(0.5, options["sleep_seconds"])

        while True:
            summary = process_pending_seo_jobs(batch_size=batch_size)
            processed = summary["processed"]

            if processed:
                self.stdout.write(
                    self.style.SUCCESS(
                        "processed={processed} completed={completed} retried={retried} failed={failed}".format(
                            **summary
                        )
                    )
                )
            elif once:
                self.stdout.write("No SEO regeneration jobs pending.")
                return

            if once:
                return

            if processed == 0:
                time.sleep(sleep_seconds)
