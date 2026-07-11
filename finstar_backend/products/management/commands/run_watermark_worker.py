import time

from django.core.management.base import BaseCommand

from products.services.watermark_bulk import process_pending_watermark_jobs


class Command(BaseCommand):
    help = "Process queued bulk watermark-application jobs."

    def add_arguments(self, parser):
        parser.add_argument("--once", action="store_true", help="Process available jobs once and exit.")
        parser.add_argument("--batch-size", type=int, default=50, help="Maximum jobs to process per iteration.")
        parser.add_argument(
            "--max-workers",
            type=int,
            default=8,
            help="Max parallel Cloudinary calls per iteration (network-bound work).",
        )
        parser.add_argument("--sleep-seconds", type=float, default=10.0, help="Idle polling interval.")

    def handle(self, *args, **options):
        once = options["once"]
        batch_size = max(1, options["batch_size"])
        max_workers = max(1, options["max_workers"])
        sleep_seconds = max(0.5, options["sleep_seconds"])

        while True:
            summary = process_pending_watermark_jobs(batch_size=batch_size, max_workers=max_workers)
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
                self.stdout.write("No watermark jobs pending.")
                return

            if once:
                return

            if processed == 0:
                time.sleep(sleep_seconds)
