import easyocr
import cv2
import re
import sys

# -----------------------------
# Image Preprocessing
# -----------------------------
def preprocess(image_path):
    img = cv2.imread(image_path)

    if img is None:
        raise ValueError("Invalid image path")

    # Resize (helps OCR accuracy)
    img = cv2.resize(img, None, fx=1.5, fy=1.5)

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Slight denoise
    gray = cv2.GaussianBlur(gray, (3, 3), 0)

    return gray


# -----------------------------
# Extract OCR Lines
# -----------------------------
def extract_lines(image_path):
    reader = easyocr.Reader(['en'])

    img = preprocess(image_path)

    results = reader.readtext(img)

    # Sort top → bottom
    results.sort(key=lambda x: x[0][0][1])

    lines = []
    for bbox, text, conf in results:
        if conf > 0.4:
            lines.append(text.strip())

    return lines


# -----------------------------
# Merge broken OCR lines
# -----------------------------
def merge_lines(lines):
    merged = []
    buffer = ""

    for line in lines:
        line = line.strip()

        if not line:
            continue

        # If line ends with price → complete item
        if re.search(r"\d{2,4}$", line):
            merged_line = (buffer + " " + line).strip()
            merged.append(merged_line)
            buffer = ""
        else:
            buffer += " " + line

    return [m.strip() for m in merged if m.strip()]


# -----------------------------
# Parse Menu Items
# -----------------------------
def parse_menu(lines):
    menu_items = []

    # Price at end of line
    price_pattern = r"(?:₹\s*)?(\d{2,4})(?:\.\d{1,2})?$"

    for line in lines:
        line = line.strip()

        # Extract price
        match = re.search(price_pattern, line)
        if not match:
            continue

        price = int(match.group(1))

        # Remove price from text
        name = re.sub(price_pattern, "", line).strip()

        # Clean text
        name = re.sub(r"[^a-zA-Z0-9\s&()/-]", "", name)
        name = re.sub(r"\s+", " ", name)

        if len(name) < 3:
            continue

        # -----------------------------
        # Category detection
        # -----------------------------
        category = "unknown"

        veg_keywords = [
            "paneer", "veg", "aloo", "mushroom", "dal", "idly",
            "dosa", "uttapam", "rice", "thali", "sabzi"
        ]

        nonveg_keywords = [
            "chicken", "mutton", "fish", "egg", "lollypop",
            "kabab", "keema", "pepper"
        ]

        lower_name = name.lower()

        if any(word in lower_name for word in veg_keywords):
            category = "veg"
        elif any(word in lower_name for word in nonveg_keywords):
            category = "non-veg"

        menu_items.append({
            "name": name,
            "price": price,
            "category": category
        })

    return menu_items


# -----------------------------
# Main Execution
# -----------------------------
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python menu_ocr.py <image_path>")
        sys.exit(1)

    image_path = sys.argv[1]

    print("\n🔍 Processing image...\n")

    # Step 1: OCR
    lines = extract_lines(image_path)

    # Step 2: Fix broken lines
    merged_lines = merge_lines(lines)

    # Step 3: Parse menu
    menu = parse_menu(merged_lines)

    # Output
    print("🍽️ Final Structured Menu:\n")

    for item in menu:
        print(item)

    print("\n✅ Done")