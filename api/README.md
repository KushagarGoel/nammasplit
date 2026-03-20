# OCR API (EasyOCR)

Python Flask API for menu image OCR using EasyOCR.

## Setup

1. Create a Python virtual environment:
```bash
cd api
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

Note: First run will download EasyOCR models (~100MB).

## Running the API

```bash
python app.py
```

Server starts on `http://localhost:5000`

## Endpoints

- `GET /health` - Health check
- `POST /ocr` - Process single image (form-data, field: `image`)
- `POST /ocr/batch` - Process multiple images (form-data, field: `images`)

## React Integration

The frontend is already configured via `src/services/ocrApi.js`.

Make sure your `.env.local` has:
```
VITE_OCR_API_URL=http://localhost:5000
```
