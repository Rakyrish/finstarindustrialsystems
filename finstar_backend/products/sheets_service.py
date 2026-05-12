"""
Google Sheets synchronization primitives for FINSTAR inventory reporting.
"""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from django.conf import settings

logger = logging.getLogger("products.sheets")

SHEET_HEADERS = [
    "Product Name",
    "SKU",
    "Category",
    "Quantity In Stock",
    "Unit",
    "Cost Price",
    "Selling Price",
    "Reorder Level",
    "Stock Status",
    "Last Updated",
]

DATA_START_ROW = 2
SKU_COL_INDEX = 1
MAX_RETRIES = 3
RETRY_BASE_DELAY = 2


@dataclass(frozen=True)
class ServiceState:
    enabled: bool
    configured: bool
    available: bool
    reason: str = ""


@dataclass(frozen=True)
class SyncRecord:
    sku: str
    product_name: str
    category: str
    quantity_in_stock: int
    unit: str
    cost_price: str
    selling_price: str
    reorder_level: int
    stock_status: str
    last_updated: str

    def to_row(self) -> list[str | int]:
        return [
            self.product_name,
            self.sku,
            self.category,
            self.quantity_in_stock,
            self.unit,
            self.cost_price,
            self.selling_price,
            self.reorder_level,
            self.stock_status,
            self.last_updated,
        ]

    @classmethod
    def from_payload(cls, payload: dict) -> "SyncRecord":
        return cls(
            sku=str(payload["sku"]),
            product_name=str(payload["product_name"]),
            category=str(payload["category"]),
            quantity_in_stock=int(payload["quantity_in_stock"]),
            unit=str(payload.get("unit") or "unit"),
            cost_price=str(payload["cost_price"]),
            selling_price=str(payload["selling_price"]),
            reorder_level=int(payload["reorder_level"]),
            stock_status=str(payload["stock_status"]),
            last_updated=str(payload["last_updated"]),
        )


def _format_decimal(value) -> str:
    return f"{value:.2f}"


def _format_datetime(value) -> str:
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    return str(value)


def serialize_standalone_item(item) -> dict:
    return {
        "product_name": item.name,
        "sku": item.sku,
        "category": item.section,
        "quantity_in_stock": item.quantity_in_stock,
        "unit": item.unit,
        "cost_price": _format_decimal(item.cost_price),
        "selling_price": _format_decimal(item.sell_price),
        "reorder_level": item.reorder_level,
        "stock_status": item.stock_status.replace("_", " ").title(),
        "last_updated": _format_datetime(item.updated_at),
    }


def serialize_inventory_item(item) -> dict:
    category = ""
    product_name = item.sku
    if getattr(item, "product", None):
        product_name = item.product.name
        if getattr(item.product, "category", None):
            category = item.product.category.name

    return {
        "product_name": product_name,
        "sku": item.sku,
        "category": category,
        "quantity_in_stock": item.quantity_in_stock,
        "unit": item.unit,
        "cost_price": _format_decimal(item.cost_price),
        "selling_price": _format_decimal(item.unit_price),
        "reorder_level": item.reorder_level,
        "stock_status": item.stock_status.replace("_", " ").title(),
        "last_updated": _format_datetime(item.last_updated),
    }


class GoogleSheetsService:
    def __init__(self, service, spreadsheet_id: str):
        self._service = service
        self._spreadsheet_id = spreadsheet_id

    # ── Public helpers ────────────────────────────────────────────────────────

    def get_spreadsheet_metadata(self) -> dict:
        """Return raw spreadsheet metadata (title, sheets list). Used by test-connection."""
        return self._retry(
            lambda: self._service.spreadsheets().get(
                spreadsheetId=self._spreadsheet_id
            ).execute()
        )

    # ── Sync operations ────────────────────────────────────────────────────────

    def sync_records(self, tab_name: str, records: list[SyncRecord]) -> tuple[int, dict[str, int]]:
        """
        Upsert records into the sheet.

        Returns (total_synced, {sku: sheet_row_number}) so callers can
        write google_sheet_row_id back to the DB.
        """
        if not records:
            return 0, {}

        ts = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        logger.info(
            "[Sheets] sync_records START | spreadsheet_id=%s tab='%s' records=%d ts=%s",
            self._spreadsheet_id, tab_name, len(records), ts,
        )

        t0 = time.perf_counter()
        self._ensure_tab_and_headers(tab_name)
        rows = self._get_all_rows(tab_name)
        row_lookup = self._build_row_lookup(rows)

        updates = []
        appends: list[SyncRecord] = []
        row_map: dict[str, int] = {}   # sku → 1-based sheet row

        for record in records:
            existing_row = row_lookup.get(record.sku)
            if existing_row is None:
                appends.append(record)
            else:
                sheet_row = DATA_START_ROW + existing_row
                row_map[record.sku] = sheet_row
                logger.info(
                    "[Sheets] Updating row %d for SKU=%s | tab='%s' | qty=%s status=%s | spreadsheet_id=%s",
                    sheet_row, record.sku, tab_name,
                    record.quantity_in_stock, record.stock_status,
                    self._spreadsheet_id,
                )
                updates.append(
                    {
                        "range": f"'{tab_name}'!A{sheet_row}:J{sheet_row}",
                        "values": [record.to_row()],
                    }
                )

        if updates:
            self._retry(
                lambda: self._service.spreadsheets().values().batchUpdate(
                    spreadsheetId=self._spreadsheet_id,
                    body={
                        "valueInputOption": "USER_ENTERED",
                        "data": updates,
                    },
                ).execute()
            )
            logger.info(
                "[Sheets] Batch UPDATE complete | %d rows updated | tab='%s' | spreadsheet_id=%s",
                len(updates), tab_name, self._spreadsheet_id,
            )

        if appends:
            for record in appends:
                logger.info(
                    "[Sheets] Creating Google Sheet row for SKU=%s | tab='%s' | name='%s' qty=%s | spreadsheet_id=%s",
                    record.sku, tab_name, record.product_name,
                    record.quantity_in_stock, self._spreadsheet_id,
                )
            result = self._retry(
                lambda: self._service.spreadsheets().values().append(
                    spreadsheetId=self._spreadsheet_id,
                    range=f"'{tab_name}'!A:J",
                    valueInputOption="USER_ENTERED",
                    insertDataOption="INSERT_ROWS",
                    body={"values": [r.to_row() for r in appends]},
                ).execute()
            )
            # Parse appended range to assign row numbers
            updated_range = (result.get("updates") or {}).get("updatedRange", "")
            start_row = self._parse_start_row(updated_range)
            for i, record in enumerate(appends):
                row_num = start_row + i if start_row else None
                if row_num:
                    row_map[record.sku] = row_num
                logger.info(
                    "[Sheets] Row CREATED for SKU=%s | row=%s | tab='%s' | spreadsheet_id=%s",
                    record.sku, row_num or "unknown", tab_name, self._spreadsheet_id,
                )

        elapsed = round(time.perf_counter() - t0, 3)
        total = len(records)
        logger.info(
            "[Sheets] Google Sheets sync successful | %d item(s) synced | tab='%s' | elapsed=%ss | spreadsheet_id=%s",
            total, tab_name, elapsed, self._spreadsheet_id,
        )
        return total, row_map

    def remove_row(self, tab_name: str, sku: str) -> bool:
        ts = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        logger.info(
            "[Sheets] Deleting row for SKU=%s | tab='%s' | spreadsheet_id=%s | ts=%s",
            sku, tab_name, self._spreadsheet_id, ts,
        )
        t0 = time.perf_counter()
        self._ensure_tab_and_headers(tab_name)
        rows = self._get_all_rows(tab_name)
        row_lookup = self._build_row_lookup(rows)
        row_index = row_lookup.get(sku)

        if row_index is None:
            logger.info(
                "[Sheets] SKU=%s not found in tab='%s' — nothing to delete | spreadsheet_id=%s",
                sku, tab_name, self._spreadsheet_id,
            )
            return True

        sheet_id = self._get_sheet_id(tab_name)
        start_index = (DATA_START_ROW - 1) + row_index
        logger.info(
            "[Sheets] Removing sheet row_index=%d (1-based row=%d) for SKU=%s | spreadsheet_id=%s",
            start_index, start_index + 1, sku, self._spreadsheet_id,
        )
        self._retry(
            lambda: self._service.spreadsheets().batchUpdate(
                spreadsheetId=self._spreadsheet_id,
                body={
                    "requests": [
                        {
                            "deleteDimension": {
                                "range": {
                                    "sheetId": sheet_id,
                                    "dimension": "ROWS",
                                    "startIndex": start_index,
                                    "endIndex": start_index + 1,
                                }
                            }
                        }
                    ]
                },
            ).execute()
        )
        elapsed = round(time.perf_counter() - t0, 3)
        logger.info(
            "[Sheets] Row DELETED for SKU=%s | tab='%s' | elapsed=%ss | spreadsheet_id=%s",
            sku, tab_name, elapsed, self._spreadsheet_id,
        )
        return True

    def full_replace_tab(self, tab_name: str, records: list[SyncRecord]) -> tuple[int, dict[str, int]]:
        ts = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        logger.info(
            "[Sheets] full_replace_tab START | tab='%s' | records=%d | spreadsheet_id=%s | ts=%s",
            tab_name, len(records), self._spreadsheet_id, ts,
        )
        t0 = time.perf_counter()
        self._ensure_tab_and_headers(tab_name)
        self._retry(
            lambda: self._service.spreadsheets().values().clear(
                spreadsheetId=self._spreadsheet_id,
                range=f"'{tab_name}'!A{DATA_START_ROW}:J",
            ).execute()
        )
        logger.info(
            "[Sheets] Tab '%s' cleared | spreadsheet_id=%s", tab_name, self._spreadsheet_id
        )

        if not records:
            return 0, {}

        self._retry(
            lambda: self._service.spreadsheets().values().update(
                spreadsheetId=self._spreadsheet_id,
                range=f"'{tab_name}'!A{DATA_START_ROW}:J",
                valueInputOption="USER_ENTERED",
                body={"values": [record.to_row() for record in records]},
            ).execute()
        )

        # Each record maps to DATA_START_ROW + index
        row_map = {
            record.sku: DATA_START_ROW + i
            for i, record in enumerate(records)
        }

        elapsed = round(time.perf_counter() - t0, 3)
        logger.info(
            "[Sheets] Google Sheets sync successful (full replace) | %d rows written | tab='%s' | elapsed=%ss | spreadsheet_id=%s",
            len(records), tab_name, elapsed, self._spreadsheet_id,
        )
        return len(records), row_map

    # ── Internal helpers ───────────────────────────────────────────────────────

    def _ensure_tab_and_headers(self, tab_name: str):
        spreadsheet = self._retry(
            lambda: self._service.spreadsheets().get(
                spreadsheetId=self._spreadsheet_id
            ).execute()
        )
        existing_titles = [
            sheet["properties"]["title"] for sheet in spreadsheet.get("sheets", [])
        ]

        if tab_name not in existing_titles:
            logger.info(
                "[Sheets] Tab '%s' not found — creating it | spreadsheet_id=%s",
                tab_name, self._spreadsheet_id,
            )
            self._retry(
                lambda: self._service.spreadsheets().batchUpdate(
                    spreadsheetId=self._spreadsheet_id,
                    body={"requests": [{"addSheet": {"properties": {"title": tab_name}}}]},
                ).execute()
            )
            spreadsheet = self._retry(
                lambda: self._service.spreadsheets().get(
                    spreadsheetId=self._spreadsheet_id
                ).execute()
            )

        header_result = self._retry(
            lambda: self._service.spreadsheets().values().get(
                spreadsheetId=self._spreadsheet_id,
                range=f"'{tab_name}'!A1:J1",
            ).execute()
        )
        if header_result.get("values"):
            return

        logger.info(
            "[Sheets] Writing headers to tab='%s' | spreadsheet_id=%s",
            tab_name, self._spreadsheet_id,
        )
        self._retry(
            lambda: self._service.spreadsheets().values().update(
                spreadsheetId=self._spreadsheet_id,
                range=f"'{tab_name}'!A1:J1",
                valueInputOption="USER_ENTERED",
                body={"values": [SHEET_HEADERS]},
            ).execute()
        )

        try:
            sheet_id = self._get_sheet_id(tab_name, spreadsheet=spreadsheet)
            self._retry(
                lambda: self._service.spreadsheets().batchUpdate(
                    spreadsheetId=self._spreadsheet_id,
                    body={
                        "requests": [
                            {
                                "repeatCell": {
                                    "range": {
                                        "sheetId": sheet_id,
                                        "startRowIndex": 0,
                                        "endRowIndex": 1,
                                    },
                                    "cell": {
                                        "userEnteredFormat": {
                                            "textFormat": {"bold": True},
                                        }
                                    },
                                    "fields": "userEnteredFormat.textFormat.bold",
                                }
                            },
                            {
                                "updateSheetProperties": {
                                    "properties": {
                                        "sheetId": sheet_id,
                                        "gridProperties": {"frozenRowCount": 1},
                                    },
                                    "fields": "gridProperties.frozenRowCount",
                                }
                            },
                        ]
                    },
                ).execute()
            )
        except Exception:
            logger.warning("Failed to format Google Sheets header row", exc_info=True)

    def _get_all_rows(self, tab_name: str) -> list[list[str]]:
        result = self._retry(
            lambda: self._service.spreadsheets().values().get(
                spreadsheetId=self._spreadsheet_id,
                range=f"'{tab_name}'!A{DATA_START_ROW}:J",
            ).execute()
        )
        return result.get("values", [])

    def _build_row_lookup(self, rows: list[list[str]]) -> dict[str, int]:
        lookup = {}
        for index, row in enumerate(rows):
            if len(row) > SKU_COL_INDEX and row[SKU_COL_INDEX]:
                lookup[row[SKU_COL_INDEX]] = index
        return lookup

    def _get_sheet_id(self, tab_name: str, spreadsheet: Optional[dict] = None) -> int:
        spreadsheet = spreadsheet or self._retry(
            lambda: self._service.spreadsheets().get(
                spreadsheetId=self._spreadsheet_id
            ).execute()
        )
        for sheet in spreadsheet.get("sheets", []):
            properties = sheet.get("properties", {})
            if properties.get("title") == tab_name:
                return properties["sheetId"]
        raise ValueError(f"Google Sheets tab '{tab_name}' not found")

    @staticmethod
    def _parse_start_row(range_str: str) -> Optional[int]:
        """Parse the starting row number from a range like \"'Sheet1'!A5:J7\"."""
        try:
            cell_part = range_str.split("!")[-1]   # e.g. A5:J7
            start_cell = cell_part.split(":")[0]   # e.g. A5
            row_num = int("".join(filter(str.isdigit, start_cell)))
            return row_num
        except Exception:
            return None

    def _retry(self, fn, max_retries: int = MAX_RETRIES):
        last_exc = None
        for attempt in range(max_retries):
            try:
                return fn()
            except Exception as exc:
                last_exc = exc
                if attempt < max_retries - 1:
                    delay = RETRY_BASE_DELAY * (2 ** attempt)
                    logger.warning(
                        "[Sheets] Google Sheets sync failed (attempt %s/%s) — retrying in %ss | error=%s | spreadsheet_id=%s",
                        attempt + 1,
                        max_retries,
                        delay,
                        str(exc)[:200],
                        self._spreadsheet_id,
                    )
                    time.sleep(delay)
        logger.error(
            "[Sheets] Google Sheets sync failed after %d attempts | error=%s | spreadsheet_id=%s",
            max_retries, str(last_exc)[:500], self._spreadsheet_id,
        )
        raise last_exc


_service_instance: Optional[GoogleSheetsService] = None


def get_sheets_service_state() -> ServiceState:
    enabled = bool(getattr(settings, "GOOGLE_SHEETS_ENABLED", False))
    spreadsheet_id = getattr(settings, "GOOGLE_SHEETS_SPREADSHEET_ID", "")
    sa_json = getattr(settings, "GOOGLE_SERVICE_ACCOUNT_JSON", "")

    if not enabled:
        return ServiceState(enabled=False, configured=False, available=False, reason="disabled")
    if not spreadsheet_id or spreadsheet_id == "your-spreadsheet-id-here":
        return ServiceState(enabled=True, configured=False, available=False, reason="missing_spreadsheet_id")
    if not sa_json:
        return ServiceState(enabled=True, configured=False, available=False, reason="missing_service_account_json")
    return ServiceState(enabled=True, configured=True, available=True)


def get_sheets_service() -> Optional[GoogleSheetsService]:
    global _service_instance

    state = get_sheets_service_state()
    if not state.configured:
        return None
    if _service_instance is not None:
        return _service_instance

    spreadsheet_id = getattr(settings, "GOOGLE_SHEETS_SPREADSHEET_ID", "")
    sa_json = getattr(settings, "GOOGLE_SERVICE_ACCOUNT_JSON", "")

    try:
        from google.oauth2.service_account import Credentials
        from googleapiclient.discovery import build

        credentials = Credentials.from_service_account_info(
            json.loads(sa_json),
            scopes=[
                "https://www.googleapis.com/auth/spreadsheets",
                "https://www.googleapis.com/auth/drive.file",
            ],
        )
        raw_service = build("sheets", "v4", credentials=credentials, cache_discovery=False)
        _service_instance = GoogleSheetsService(raw_service, spreadsheet_id)
        logger.info(
            "[Sheets] Service initialized | spreadsheet_id=%s", spreadsheet_id
        )
        return _service_instance
    except Exception:
        logger.exception(
            "[Sheets] Failed to initialize Google Sheets service | spreadsheet_id=%s", spreadsheet_id
        )
        return None


def reset_sheets_service():
    global _service_instance
    _service_instance = None
