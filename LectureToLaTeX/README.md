# LectureToLaTeX Backend

Flask backend server for converting blackboard notes into LaTeX documents using AI-powered OCR and providing a math chatbot.

## Features

- **OCR Pipeline**: Convert photos of blackboard/whiteboard math to LaTeX using GPT-4o Vision
- **Image Enhancement**: Automatic denoising and contrast enhancement with OpenCV
- **Math Chatbot**: Interactive math helper powered by SymPy and GPT-4o
- **PDF Generation**: Automatic LaTeX compilation to PDF
- **Web Interface**: Simple upload interface for testing
- **REST API**: Endpoints for mobile app integration
- **Request Tracking**: Request IDs for debugging and logging

## Prerequisites

- Python 3.8+
- OpenAI API key with GPT-4o access
- (Optional) LaTeX installation for PDF generation

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**

   Create a `.env` file or export variables:
   ```bash
   export OPENAI_API_KEY="your-openai-api-key-here"
   export MODEL_NAME="gpt-4o"
   export HOST="0.0.0.0"
   export PORT="8000"
   export MAX_FILE_SIZE_MB="16"
   export TIMEOUT_SECONDS="120"
   ```

3. **Run the server:**
   ```bash
   python app.py
   ```

   Server will run on `http://0.0.0.0:8000`

## Usage

### Web Interface

1. Navigate to `http://localhost:8000` in your browser
2. Upload an image of your blackboard notes
3. Wait for processing (denoising → OCR → LaTeX generation)
4. Download the generated `.tex` or `.pdf` file

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check endpoint |
| `/upload` | POST | Upload photos for OCR/LaTeX conversion |
| `/chat` | POST | Math chatbot queries |
| `/history` | GET | Get list of generated notes |
| `/download/<note_name>?type=tex\|pdf` | GET | Download LaTeX or PDF files |
| `/delete/<note_name>` | DELETE | Delete generated note |

### Example API Usage

**Upload for OCR:**
```bash
curl -X POST http://localhost:8000/upload \
  -F "files=@photo1.jpg" \
  -F "files=@photo2.jpg" \
  -F "note_name=lecture1"
```

**Chat with math bot:**
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the derivative of x^2?"}'
```

## Project Structure

- **`app.py`** - Main Flask application with all routes
- **`math_chatbot.py`** - SymPy-powered math assistant
- **`denoise_pipeline.py`** - Image preprocessing and enhancement
- **`feedback.py`** - User feedback collection utilities
- **`templates/`** - Web interface HTML
- **`static/`** - Static assets (CSS, JS)
- **`notes_out/`** - Generated LaTeX and PDF files
- **`notes_feedback/`** - User feedback data
- **`old/`** - Legacy files (not in use)

## Configuration

The server can be configured via environment variables or `.env` file:

- `OPENAI_API_KEY` - Required. Your OpenAI API key
- `MODEL_NAME` - Default: "gpt-4o". OpenAI model to use
- `HOST` - Default: "0.0.0.0". Server host
- `PORT` - Default: "8000". Server port
- `MAX_FILE_SIZE_MB` - Default: "16". Maximum upload size
- `TIMEOUT_SECONDS` - Default: "120". Request timeout

## Troubleshooting

See [BACKEND_TROUBLESHOOTING.md](BACKEND_TROUBLESHOOTING.md) for detailed troubleshooting guide.

**Common issues:**
- **Port conflict**: Change PORT in `.env` file
- **Missing API key**: Set OPENAI_API_KEY environment variable
- **Import errors**: Run `pip install -r requirements.txt`
- **Permission denied**: Check file permissions on `notes_out/` directory

## Logs

Check `app.log` for detailed server logs including:
- Request IDs for tracing
- Error messages and stack traces
- Processing times
- API responses
