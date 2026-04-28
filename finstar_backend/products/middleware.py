import logging
import time


request_logger = logging.getLogger("products.request")


class ApiRequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.path.startswith("/api/"):
            return self.get_response(request)

        start_time = time.perf_counter()

        try:
            response = self.get_response(request)
        except Exception:
            duration_ms = (time.perf_counter() - start_time) * 1000
            request_logger.exception(
                "API exception method=%s path=%s duration_ms=%.2f",
                request.method,
                request.path,
                duration_ms,
            )
            raise

        duration_ms = (time.perf_counter() - start_time) * 1000
        user_id = getattr(getattr(request, "user", None), "id", None)

        if response.status_code >= 500:
            level = logging.ERROR
        elif response.status_code >= 400 or duration_ms >= 1000:
            level = logging.WARNING
        else:
            level = logging.INFO

        request_logger.log(
            level,
            "API request method=%s path=%s status=%s duration_ms=%.2f user_id=%s",
            request.method,
            request.path,
            response.status_code,
            duration_ms,
            user_id,
        )

        return response
