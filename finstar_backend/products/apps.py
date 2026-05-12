from django.apps import AppConfig


class ProductsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "products"

    def ready(self):
        # Register Django signals
        import products.signals  # noqa: F401

        # In DEBUG mode, auto-start the sync worker as a background daemon thread
        # so developers don't need to run a second terminal process.
        # In production the worker runs as a separate container/process.
        import os
        if os.environ.get("DJANGO_SETTINGS_MODULE") and self._should_start_worker():
            self._start_dev_sync_worker()

    @staticmethod
    def _should_start_worker() -> bool:
        """Only start the inline worker if DEBUG=True and not inside a migration/management command."""
        try:
            from django.conf import settings
            if not getattr(settings, "DEBUG", False):
                return False
            # Avoid starting during management commands like makemigrations, migrate, etc.
            import sys
            skip_commands = {
                "migrate", "makemigrations", "showmigrations", "sqlmigrate",
                "shell", "dbshell", "collectstatic", "test", "dumpdata", "loaddata",
            }
            argv = sys.argv
            if len(argv) >= 2 and argv[1] in skip_commands:
                return False
            # Django's dev server forks a reloader process; only start in the child
            if os.environ.get("RUN_MAIN") != "true":
                return False
            return True
        except Exception:
            return False

    @staticmethod
    def _start_dev_sync_worker():
        """Spin up the inventory sync worker in a daemon background thread."""
        import threading
        import logging
        import time

        logger = logging.getLogger("products.sync")

        def _worker_loop():
            # Give Django a moment to fully boot before processing jobs
            time.sleep(3)
            logger.info("[Sheets] Dev sync worker started (DEBUG mode) — polling every 5s")
            while True:
                try:
                    from products.services.inventory_sync import process_pending_sync_jobs
                    summary = process_pending_sync_jobs(batch_size=25)
                    if summary["processed"]:
                        logger.info(
                            "[Sheets] Worker cycle | processed=%d success=%d retry=%d failed=%d skipped=%d",
                            summary["processed"], summary["success"],
                            summary["retry"], summary["failed"], summary["skipped"],
                        )
                except Exception:
                    logger.exception("[Sheets] Dev sync worker encountered an error")
                time.sleep(5)

        thread = threading.Thread(target=_worker_loop, daemon=True, name="finstar-sheets-sync-worker")
        thread.start()
