#!/usr/bin/env python3
"""
verify-forms-reader.py

Standalone smoke-test for forms-fixture.xlsx
Works without Node / ExcelJS — uses Python's openpyxl.
Run this to quickly check the fixture before running Playwright tests.

Usage:
    python3 src/data/fixtures/verify-forms-reader.py
    # or with a custom path:
    python3 src/data/fixtures/verify-forms-reader.py /path/to/forms-fixture.xlsx
"""

import sys
import os

# Install openpyxl if missing
try:
    import openpyxl
except ImportError:
    print("openpyxl not found — installing...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "openpyxl", "--break-system-packages", "-q"])
    import openpyxl

FIXTURE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    os.path.dirname(__file__), "forms-fixture.xlsx"
)

REQUIRED_COLUMNS = [
    "Form Name", "Form ID", "Form Number", "Formset Name",
    "Product", "Sub Segment", "Mandatory / Optional", "Applicable State(s)",
    "Template Version", "Form Field", "Field ID / Key", "Field Type",
    "Expected Value", "Value Source", "PDF Label", "Required", "Notes",
]

VALID_FIELD_TYPES = {"text", "dropdown", "radio", "checkbox", "date", "currency", "textarea", "number"}

GREEN = "\033[92m"
RED   = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"
BOLD  = "\033[1m"


def ok(msg):  print(f"{GREEN}✓{RESET} {msg}")
def err(msg): print(f"{RED}✗{RESET} {msg}"); sys.exit(1)
def warn(msg):print(f"{YELLOW}⚠{RESET} {msg}")
def hr(n):    return "─" * n
def pad(s, n):return str(s or "")[:n].ljust(n)


def main():
    print(f"\n{BOLD}[verify-forms-reader]{RESET} Checking: {FIXTURE}\n")

    # 1. File exists
    if not os.path.isfile(FIXTURE):
        err(f"Fixture not found: {FIXTURE}\n"
            "  Generate it first:\n"
            "    python3 /tmp/scratchpad/gen_fixture.py\n"
            "  — or in the project (needs ExcelJS):\n"
            "    npx ts-node src/data/fixtures/generate-forms-fixture.ts")

    # 2. Open workbook
    wb    = openpyxl.load_workbook(FIXTURE, read_only=True)
    names = wb.sheetnames
    if "Form Field Mapping" not in names:
        err(f'Sheet "Form Field Mapping" not found. Available sheets: {names}')
    ws = wb["Form Field Mapping"]

    # 3. Validate header
    header = [str(cell.value or "").strip() for cell in next(ws.iter_rows(min_row=1, max_row=1))]
    missing = [c for c in REQUIRED_COLUMNS if c not in header]
    if missing:
        err(f"Missing required columns: {', '.join(missing)}")
    ok(f"All {len(REQUIRED_COLUMNS)} required columns present")

    col_idx = {name: i for i, name in enumerate(header)}

    def val(row, col_name):
        idx = col_idx.get(col_name)
        if idx is None: return ""
        v = row[idx].value
        return str(v).strip() if v is not None else ""

    # 4. Parse rows
    form_map = {}
    total_rows = 0
    for row in ws.iter_rows(min_row=2):
        form_id = val(row, "Form ID")
        if not form_id:
            continue
        total_rows += 1
        if form_id not in form_map:
            form_map[form_id] = {
                "formId":      form_id,
                "formName":    val(row, "Form Name"),
                "formNumber":  val(row, "Form Number"),
                "formset":     val(row, "Formset Name"),
                "type":        val(row, "Mandatory / Optional"),
                "fields":      [],
            }
        field_name = val(row, "Form Field")
        if field_name:
            form_map[form_id]["fields"].append({
                "fieldName":  field_name,
                "fieldType":  val(row, "Field Type"),
                "testValue":  val(row, "Expected Value"),
                "pdfLabel":   val(row, "PDF Label"),
                "required":   val(row, "Required").upper() == "Y",
            })

    forms       = list(form_map.values())
    total_fields = sum(len(f["fields"]) for f in forms)

    if not forms:
        err("No form rows found — fixture may be empty.")

    ok(f"Loaded {len(forms)} form(s), {total_fields} field(s) across {total_rows} data rows\n")

    # 5. Print summary
    W = [24, 22, 36, 11]
    print(
        f"  {BOLD}{pad('Form ID', W[0])}  {pad('Form Number', W[1])}  "
        f"{pad('Name', W[2])}  {pad('Type', W[3])}  Fields{RESET}"
    )
    print(f"  {hr(W[0])}  {hr(W[1])}  {hr(W[2])}  {hr(W[3])}  {hr(6)}")
    for f in forms:
        t_color = RED if f["type"] == "Mandatory" else GREEN
        print(
            f"  {pad(f['formId'], W[0])}  {pad(f['formNumber'], W[1])}  "
            f"{pad(f['formName'], W[2])}  {t_color}{pad(f['type'], W[3])}{RESET}  "
            f"{len(f['fields']):>6}"
        )

    # 6. Mandatory check
    mandatory = [f for f in forms if f["type"] == "Mandatory"]
    optional  = [f for f in forms if f["type"] == "Optional"]
    print()
    ok(f"{len(mandatory)} mandatory form(s), {len(optional)} optional form(s)")

    # 7. Field type validation
    bad = []
    for f in forms:
        for fld in f["fields"]:
            if fld["fieldType"] and fld["fieldType"] not in VALID_FIELD_TYPES:
                bad.append(f"  {f['formId']} / {fld['fieldName']}: \"{fld['fieldType']}\"")
    if bad:
        warn("Unknown field types (may cause fillFormField() to skip):")
        for b in bad: print(b)
    else:
        ok("All field types valid")

    # 8. Required fields have testValues
    missing_vals = []
    for f in forms:
        for fld in f["fields"]:
            if fld["required"] and not fld["testValue"]:
                missing_vals.append(f"  {f['formId']} / {fld['fieldName']}")
    if missing_vals:
        warn(f"{len(missing_vals)} required field(s) have no Expected Value:")
        for m in missing_vals[:5]: print(m)
        if len(missing_vals) > 5: print(f"  ... and {len(missing_vals)-5} more")
    else:
        ok("All required fields have an Expected Value")

    print(f"\n{GREEN}{BOLD}✓ All smoke checks passed — forms-fixture.xlsx is valid.{RESET}\n")


if __name__ == "__main__":
    main()
