from flask import Flask, request, jsonify
from flask_cors import CORS
import easyocr
import cv2
import numpy as np
import re
import sys
import io

app = Flask(__name__)
CORS(app)

# Load EasyOCR reader once at startup (this takes a few seconds)
print("Loading EasyOCR model...")
reader = easyocr.Reader(['en'], gpu=False)
print("EasyOCR model loaded!")


def preprocess_image(image_bytes):
    """Preprocess image for better OCR accuracy."""
    # Convert bytes to numpy array
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError("Invalid image data")

    # Resize (helps OCR accuracy)
    img = cv2.resize(img, None, fx=1.5, fy=1.5)

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Slight denoise
    gray = cv2.GaussianBlur(gray, (3, 3), 0)

    return gray


def extract_lines(image_bytes):
    """Extract OCR lines from image."""
    img = preprocess_image(image_bytes)
    results = reader.readtext(img)

    # Sort top -> bottom by y-coordinate
    results.sort(key=lambda x: x[0][0][1])

    lines = []
    for bbox, text, conf in results:
        if conf > 0.4:
            lines.append(text.strip())

    return lines


def merge_lines(lines):
    """Merge broken OCR lines."""
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


def parse_menu(lines):
    """Parse menu items from lines with description detection."""
    menu_items = []

    # Price at end of line
    price_pattern = r"(?:₹\s*)?(\d{2,4})(?:\.\d{1,2})?$"

    # Patterns that indicate a description line
    desc_indicators = [
        r'\([^)]+\)',  # Text in parentheses
        r'(?:served|with|topped|garnished|made|prepared|cooked)',
        r'(?:choice\s+of|accompanied|along)',
    ]

    veg_keywords = [
        "paneer", "veg", "aloo", "mushroom", "dal", "idly",
        "dosa", "uttapam", "rice", "thali", "sabzi", "vegetable",
        "gobi", "palak", "mix", "sambar", "rasam", "pulao",
        "jeera", "steam", "plain", "curd", "raita", "salad"
    ]

    nonveg_keywords = [
        "chicken", "mutton", "fish", "prawn", "shrimp", "egg",
        "lollypop", "kabab", "keema", "pepper", "beef", "pork",
        "lamb", "tandoori", "tikka", "biryani", "non-veg", "non veg"
    ]

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Extract price
        match = re.search(price_pattern, line)
        if not match:
            i += 1
            continue

        price = int(match.group(1))

        # Remove price from text
        name_part = re.sub(price_pattern, "", line).strip()

        # Check for description in parentheses within the same line
        description = None
        paren_match = re.search(r'\(([^)]+)\)', name_part)
        if paren_match:
            description = paren_match.group(1).strip()
            # Remove description from name
            name = re.sub(r'\s*\([^)]+\)\s*', ' ', name_part).strip()
        else:
            name = name_part

        # Clean name text
        name = re.sub(r"[^a-zA-Z0-9\s&()/-]", "", name)
        name = re.sub(r"\s+", " ", name)

        if len(name) < 3:
            i += 1
            continue

        # Look ahead for description on next line (if no price and looks like description)
        if description is None and i + 1 < len(lines):
            next_line = lines[i + 1].strip()
            # Next line has no price and is not another dish name
            has_price = re.search(price_pattern, next_line)
            is_short = len(next_line.split()) <= 8
            looks_like_desc = any(re.search(p, next_line, re.I) for p in desc_indicators)

            if not has_price and is_short and (looks_like_desc or len(next_line) < 50):
                description = next_line.strip('()[]{}')
                i += 1  # Skip next line as it's the description

        # Category detection (VEG, NON_VEG, UNKNOWN)
        lower_name = name.lower()
        if any(word in lower_name for word in nonveg_keywords):
            category = "NON_VEG"
        elif any(word in lower_name for word in veg_keywords):
            category = "VEG"
        else:
            category = "UNKNOWN"

        menu_items.append({
            "name": name,
            "description": description,
            "category": category,
            "price": price
        })

        i += 1

    return menu_items


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "ok", "service": "ocr-api"})


@app.route('/ocr', methods=['POST'])
def process_image():
    """Process menu image and return extracted items."""
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file = request.files['image']

    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    try:
        # Read image bytes
        image_bytes = file.read()

        if len(image_bytes) == 0:
            return jsonify({"error": "Empty file"}), 400

        # Step 1: OCR
        lines = extract_lines(image_bytes)

        # Step 2: Fix broken lines
        merged_lines = merge_lines(lines)

        # Step 3: Parse menu
        menu_items = parse_menu(merged_lines)

        return jsonify({
            "items": menu_items,
            "rawText": "\n".join(merged_lines),
            "count": len(menu_items)
        })

    except Exception as e:
        print(f"Error processing image: {e}", file=sys.stderr)
        return jsonify({"error": str(e)}), 500


@app.route('/ocr/batch', methods=['POST'])
def process_batch():
    """Process multiple menu images."""
    if 'images' not in request.files:
        return jsonify({"error": "No images provided"}), 400

    files = request.files.getlist('images')
    all_items = []
    raw_texts = []

    for i, file in enumerate(files):
        try:
            image_bytes = file.read()
            lines = extract_lines(image_bytes)
            merged_lines = merge_lines(lines)
            menu_items = parse_menu(merged_lines)

            all_items.extend(menu_items)
            raw_texts.append(f"--- Image {i + 1} ---\n" + "\n".join(merged_lines))

        except Exception as e:
            print(f"Error processing image {i + 1}: {e}", file=sys.stderr)
            raw_texts.append(f"--- Image {i + 1} ---\n[Error: {e}]")

    # Remove duplicates based on name
    seen_names = set()
    unique_items = []
    for item in all_items:
        normalized_name = item["name"].lower().strip()
        if normalized_name not in seen_names and item["name"].strip():
            seen_names.add(normalized_name)
            unique_items.append(item)

    return jsonify({
        "items": unique_items,
        "rawText": "\n\n".join(raw_texts),
        "count": len(unique_items)
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
