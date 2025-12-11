import os
import subprocess
import tempfile
import uuid
import base64
import json
import logging
import sys
from datetime import datetime, timezone
from logging.handlers import RotatingFileHandler
from flask import Flask, request, render_template, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
from openai import OpenAI
from denoise_pipeline import run_denoise
from PIL import Image
from math_chatbot import math_engine, format_reply
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# =============== CONFIGURATION ===============
DOCS_DIR = os.getenv("DOCS_DIR", "notes_out")
FEEDBACK_DIR = os.getenv("FEEDBACK_DIR", "notes_feedback")
MODEL_NAME = os.getenv("MODEL_NAME", "gpt-4o")
API_KEY = os.getenv("OPENAI_API_KEY") or os.getenv("DEEPSEEK_API_KEY")
BASE_URL = os.getenv("OPENAI_BASE_URL")  # Optional custom endpoint
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "16"))
TIMEOUT_SECONDS = int(os.getenv("TIMEOUT_SECONDS", "120"))  # Increased for mobile
DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"
PORT = int(os.getenv("PORT", "8000"))
HOST = os.getenv("HOST", "0.0.0.0")

# Validate critical configuration
if not API_KEY or API_KEY == "sk-your-key-here":
    raise ValueError("OPENAI_API_KEY must be set in environment or .env file")

# =============================================

app = Flask(__name__)

# CORS configuration for mobile app
CORS(app, resources={
    r"/*": {
        "origins": "*",  # Allow all origins for development; restrict in production
        "methods": ["GET", "POST", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "X-Request-ID"],
        "expose_headers": ["X-Request-ID"],
    }
})

app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE_MB * 1024 * 1024
app.config['UPLOAD_FOLDER'] = tempfile.gettempdir()
app.config['JSON_SORT_KEYS'] = False  # Preserve JSON key order

# =============== LOGGING SETUP ===============
logging.basicConfig(
    level=logging.INFO if not DEBUG else logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        RotatingFileHandler('app.log', maxBytes=10*1024*1024, backupCount=3),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

# Request ID middleware for tracking
@app.before_request
def add_request_id():
    request.request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
    logger.info(f"[{request.request_id}] {request.method} {request.path}")

@app.after_request
def add_request_id_header(response):
    if hasattr(request, 'request_id'):
        response.headers['X-Request-ID'] = request.request_id
    return response

# =============== RESPONSE HELPERS ===============
def error_response(error_code, message, status=400, details=None):
    """Return standardized error response with request ID"""
    response = {
        'success': False,
        'error': {
            'code': error_code,
            'message': message,
            'request_id': getattr(request, 'request_id', None)
        }
    }
    if details and DEBUG:
        response['error']['details'] = details

    logger.error(f"[{getattr(request, 'request_id', 'N/A')}] Error {error_code}: {message}")
    return jsonify(response), status

def success_response(data, message=None):
    """Return standardized success response"""
    response = {
        'success': True,
        'data': data
    }
    if message:
        response['message'] = message
    return jsonify(response)
# ================================================

os.makedirs(DOCS_DIR, exist_ok=True)
os.makedirs(FEEDBACK_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def encode_image_to_base64(image_path):
    """Encode an image file to base64 string for vision API"""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def get_image_mime_type(image_path):
    """Determine MIME type based on file extension"""
    ext = image_path.lower().split('.')[-1]
    mime_types = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'bmp': 'image/bmp',
        'webp': 'image/webp'
    }
    return mime_types.get(ext, 'image/jpeg')

def process_images_to_latex(image_paths):
    """
    Process multiple images through the full pipeline: denoise -> GPT-4o Vision -> LaTeX
    Sends images directly to GPT-4o vision API instead of using OCR.
    Combines all images into a single LaTeX document.
    Returns the LaTeX source code and paths to generated files.
    """
    # Create a temporary processed directory for this session
    session_id = str(uuid.uuid4())
    processed_dir = os.path.join(tempfile.gettempdir(), f"lecture_processed_{session_id}")
    os.makedirs(processed_dir, exist_ok=True)
    
    try:
        enhanced_images = []
        
        # Process each image through denoise pipeline
        request_id = getattr(request, 'request_id', 'N/A')
        for idx, image_path in enumerate(image_paths):
            logger.info(f"[{request_id}] Processing image {idx + 1}/{len(image_paths)}...")

            # Step 1: Run denoise pipeline
            paths = run_denoise(in_path=image_path, processed_dir=processed_dir)
            enh_path = paths["enhanced"]
            logger.info(f"[{request_id}] Enhanced image saved: {enh_path}")
            enhanced_images.append(enh_path)

        logger.info(f"[{request_id}] Enhanced {len(enhanced_images)} images. Preparing for GPT-4o vision API...")

        # Generate meaningful filename with date/time
        now = datetime.now()
        date_str = now.strftime('%Y-%m-%d_%H-%M-%S')
        if len(image_paths) > 1:
            note_name = f"notes_{date_str}_multi{len(image_paths)}"
        else:
            note_name = f"notes_{date_str}"

        # Step 2: Prepare images and call GPT-4o vision API
        if BASE_URL:
            client = OpenAI(api_key=API_KEY, base_url=BASE_URL, timeout=TIMEOUT_SECONDS)
        else:
            client = OpenAI(api_key=API_KEY, timeout=TIMEOUT_SECONDS)  # Use default OpenAI endpoint

        system_prompt = (
            "You are a LaTeX math transcription AND explanation assistant using GPT-4o vision capabilities. "
            "You will be given images of handwritten mathematics from a blackboard. "
            "Your task is to carefully analyze the images, understand the mathematical content, and "
            "produce a polished, structured LaTeX article with detailed explanations.\n\n"

            "=== CORE TASKS ===\n"
            "1. Carefully examine the images and transcribe all mathematical content into proper LaTeX.\n"
            "2. Add clear explanatory text (in full sentences) before or after each major step, "
            "suitable for an advanced undergraduate or beginning graduate student.\n"
            "3. Preserve all important equations, derivations, and logical structure.\n"
            "4. Interpret handwritten symbols, equations, and mathematical notation accurately using your vision capabilities.\n\n"

            "=== STRICT LATEX RULES ===\n"
            "• Every mathematical symbol or expression MUST be in math mode.\n"
            "  – Inline math → \\( ... \\)\n"
            "  – Display math → \\[ ... \\]\n"
            "• Never leave raw math symbols in text (e.g. x^2, sum, int, a/b).\n"
            "• Use correct LaTeX operators: \\ker, \\operatorname{Gal}, \\Hom, \\bQ, \\bZ, \\mod, \\leq, etc.\n"
            "• Use standard formatting for groups, fields, cosets, cyclotomic extensions, etc.\n"
            "• No markdown code fences. ONLY pure LaTeX.\n\n"

            "=== DOCUMENT STRUCTURE ===\n"
            "• Output a complete LaTeX document:\n"
            "  \\documentclass[12pt]{article}\n"
            "  \\usepackage{amsmath, amssymb, amsfonts, amsthm}\n"
            "  ...\n"
            "  \\begin{document}\n"
            "  ... content ...\n"
            "  \\end{document}\n"
            "• Use sections, subsections, and paragraphs to organize the material.\n"
            "• You may use environments such as theorem, definition, remark, proof, itemize, or enumerate.\n"
            "• Explanations must also follow the strict math-mode rules when referencing symbols.\n\n"

            "=== STYLE REQUIREMENTS ===\n"
            "Your output should resemble a clean textbook or research monograph style similar to "
            "graduate-level algebraic number theory literature. "
            "Ensure consistent math-mode usage, operator spacing, and paragraph structure.\n\n"

            "If something in an image is ambiguous or unreadable, include a LaTeX comment '% unclear'.\n"
            "Output ONLY LaTeX, with no markdown and no external commentary."
        )
        
        # Build the user message content with text and images (OpenAI vision format)
        user_content = []
        
        # Add text instruction
        if len(enhanced_images) == 1:
            instruction_text = (
                "Please analyze this image of handwritten mathematics from a blackboard using your vision capabilities. "
                "Transcribe all mathematical content into clean LaTeX, using article class with packages: amsmath and amssymb. "
                "Insert detailed explanations and commentary in LaTeX so that a reader can follow the reasoning.\n\n"
                "You should keep the original mathematical content and derivations, but you are encouraged to:\n"
                "• Organize the material with sections/subsections,\n"
                "• Add short explanatory paragraphs around each important formula or step, and\n"
                "• Clarify the meaning of symbols and assumptions when they are implicit.\n"
                "• Include \\usepackage{amsmath} and \\usepackage{amssymb} in the preamble."
            )
        else:
            instruction_text = (
                f"Please analyze these {len(enhanced_images)} images of handwritten mathematics from a blackboard using your vision capabilities. "
                "They may be part of a sequence of related content. "
                "Transcribe all mathematical content from all images into a single coherent LaTeX document, "
                "using article class with packages: amsmath and amssymb. "
                "Insert detailed explanations and commentary in LaTeX so that a reader can follow the reasoning.\n\n"
                "You should keep the original mathematical content and derivations, but you are encouraged to:\n"
                "• Combine all images into a single coherent document,\n"
                "• Organize the material with sections/subsections,\n"
                "• Add short explanatory paragraphs around each important formula or step, and\n"
                "• Clarify the meaning of symbols and assumptions when they are implicit.\n"
                "• Include \\usepackage{amsmath} and \\usepackage{amssymb} in the preamble."
            )
        
        user_content.append({"type": "text", "text": instruction_text})
        
        # Add each enhanced image
        for idx, enh_path in enumerate(enhanced_images):
            print(f"[INFO] Encoding image {idx + 1}/{len(enhanced_images)} for vision API...")
            base64_image = encode_image_to_base64(enh_path)
            mime_type = get_image_mime_type(enh_path)
            
            user_content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{mime_type};base64,{base64_image}"
                }
            })
            
            if len(enhanced_images) > 1 and idx < len(enhanced_images) - 1:
                # Add separator text between images
                user_content.append({
                    "type": "text",
                    "text": f"\n--- End of Image {idx + 1} / {len(enhanced_images)} ---\n"
                })

        print(f"[INFO] Sending {len(enhanced_images)} image(s) to GPT-4o vision API...")
        
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            stream=False,
        )

        latex_source = response.choices[0].message.content
        print("[INFO] LLM returned LaTeX.")

        # Clean up markdown code fences if present
        if latex_source.strip().startswith("```"):
            latex_source = latex_source.strip().strip("`")
            if latex_source.startswith("latex"):
                latex_source = latex_source[5:].strip()
            if latex_source.startswith("\n"):
                latex_source = latex_source[1:]
        
        # Ensure document has proper structure (only fix if clearly broken)
        if "\\documentclass" not in latex_source:
            # Missing document class - wrap the content
            latex_source = "\\documentclass{article}\n\\usepackage{amsmath}\n\\usepackage{amssymb}\n\\begin{document}\n" + latex_source + "\n\\end{document}"
        else:
            # Ensure amssymb package is included (needed for symbols like \lhd, \rhd, etc.)
            if "\\usepackage{amssymb}" not in latex_source and "\\usepackage{amsmath}" in latex_source:
                latex_source = latex_source.replace("\\usepackage{amsmath}", "\\usepackage{amsmath}\n\\usepackage{amssymb}")
            elif "\\usepackage{amssymb}" not in latex_source:
                # Add both packages if neither exists
                if "\\begin{document}" in latex_source:
                    latex_source = latex_source.replace("\\begin{document}", "\\usepackage{amsmath}\n\\usepackage{amssymb}\n\\begin{document}")
                else:
                    # Add before \documentclass if structure is unusual
                    if "\\documentclass" in latex_source:
                        docclass_pos = latex_source.find("\\documentclass")
                        next_line = latex_source.find("\n", docclass_pos)
                        if next_line != -1:
                            latex_source = latex_source[:next_line+1] + "\\usepackage{amsmath}\n\\usepackage{amssymb}\n" + latex_source[next_line+1:]
            
            if "\\begin{document}" not in latex_source and "\\end{document}" in latex_source:
                # Has end but no begin - insert begin before end
                latex_source = latex_source.replace("\\end{document}", "\\begin{document}\n\\end{document}")
            elif "\\end{document}" not in latex_source and "\\begin{document}" in latex_source:
                # Has begin but no end - add end
                latex_source = latex_source + "\n\\end{document}"

        # Step 4: Save LaTeX file
        tex_path = os.path.join(DOCS_DIR, f"{note_name}.tex")
        with open(tex_path, "w") as f:
            f.write(latex_source)
        print(f"[INFO] Wrote LaTeX to {tex_path}")

        # Step 5: Compile to PDF (optional, may fail if LaTeX not installed)
        pdf_path = None
        compilation_error = None
        
        # Try latexmk first
        try:
            result = subprocess.run(
                ["latexmk", "-pdf", "-interaction=nonstopmode", f"{note_name}.tex", f"-outdir={DOCS_DIR}"],
                check=True,
                cwd=DOCS_DIR,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=60,
            )
            # latexmk with -outdir creates a subdirectory, check both locations with retry
            import time
            pdf_path = None
            for attempt in range(3):
                # Check main directory first
                main_path = os.path.join(DOCS_DIR, f"{note_name}.pdf")
                if os.path.exists(main_path):
                    pdf_path = main_path
                    break
                # Check subdirectory (latexmk sometimes creates notes_out/notes_out/)
                subdir_path = os.path.join(DOCS_DIR, DOCS_DIR, f"{note_name}.pdf")
                if os.path.exists(subdir_path):
                    pdf_path = subdir_path
                    break
                # Wait a bit before retrying (file system might need time)
                if attempt < 2:
                    time.sleep(0.5)
            
            if pdf_path and os.path.exists(pdf_path):
                print(f"[INFO] PDF generated → {pdf_path}")
            else:
                pdf_path = None
                print("[WARN] PDF file not found after latexmk compilation")
                # Try to read log file for errors
                log_path = os.path.join(DOCS_DIR, DOCS_DIR, f"{note_name}.log")
                if os.path.exists(log_path):
                    with open(log_path, 'r', errors='ignore') as f:
                        log_content = f.read()
                        if 'Error' in log_content or 'Fatal' in log_content:
                            # Extract error lines
                            error_lines = [line for line in log_content.split('\n') if 'Error' in line or 'Fatal' in line]
                            compilation_error = '\n'.join(error_lines[-5:])  # Last 5 error lines
                            print(f"[ERROR] LaTeX compilation errors found:\n{compilation_error}")
        except FileNotFoundError:
            print("[WARN] latexmk not found, trying pdflatex...")
            # Fallback to pdflatex
            try:
                subprocess.run(
                    ["pdflatex", "-interaction=nonstopmode", f"{note_name}.tex"],
                    check=True,
                    cwd=DOCS_DIR,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=60,
                )
                # Run twice for references
                subprocess.run(
                    ["pdflatex", "-interaction=nonstopmode", f"{note_name}.tex"],
                    check=True,
                    cwd=DOCS_DIR,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=60,
                )
                # Check for PDF with retry (file system might need time)
                import time
                pdf_path = None
                for attempt in range(3):
                    main_path = os.path.join(DOCS_DIR, f"{note_name}.pdf")
                    if os.path.exists(main_path):
                        pdf_path = main_path
                        break
                    subdir_path = os.path.join(DOCS_DIR, DOCS_DIR, f"{note_name}.pdf")
                    if os.path.exists(subdir_path):
                        pdf_path = subdir_path
                        break
                    if attempt < 2:
                        time.sleep(0.5)
                
                if pdf_path and os.path.exists(pdf_path):
                    print(f"[INFO] PDF generated with pdflatex → {pdf_path}")
                else:
                    pdf_path = None
                    print("[WARN] PDF file not found after pdflatex compilation")
            except (FileNotFoundError, subprocess.TimeoutExpired, subprocess.CalledProcessError) as e:
                print(f"[WARN] pdflatex also failed: {str(e)}")
                if isinstance(e, subprocess.CalledProcessError):
                    compilation_error = e.stderr.decode("utf-8", errors="ignore")[:1000]
        except subprocess.TimeoutExpired:
            print("[WARN] PDF compilation timed out")
            compilation_error = "Compilation timed out after 60 seconds"
        except subprocess.CalledProcessError as e:
            print("[WARN] LaTeX compilation failed")
            stderr_output = e.stderr.decode("utf-8", errors="ignore")
            stdout_output = e.stdout.decode("utf-8", errors="ignore")
            compilation_error = stderr_output[:1000] if stderr_output else stdout_output[:1000]
            print(f"[ERROR] Compilation error:\n{compilation_error}")
            
            # Try to read log file for more details
            log_path = os.path.join(DOCS_DIR, DOCS_DIR, f"{note_name}.log")
            if os.path.exists(log_path):
                with open(log_path, 'r', errors='ignore') as f:
                    log_content = f.read()
                    if 'Error' in log_content or 'Fatal' in log_content:
                        error_lines = [line for line in log_content.split('\n') if 'Error' in line or 'Fatal' in line]
                        if error_lines:
                            compilation_error = '\n'.join(error_lines[-10:])  # Last 10 error lines
                            print(f"[ERROR] Log file errors:\n{compilation_error}")

        return {
            "latex": latex_source,
            "tex_path": tex_path,
            "pdf_path": pdf_path,
            "note_name": note_name,
            "compilation_error": compilation_error
        }
    finally:
        # Clean up temporary processed files
        try:
            import shutil
            if os.path.exists(processed_dir):
                shutil.rmtree(processed_dir)
        except:
            pass

def process_image_to_latex(image_path):
    """
    Process a single image through the full pipeline: denoise -> GPT-4o Vision -> LaTeX
    Returns the LaTeX source code and paths to generated files.
    """
    return process_images_to_latex([image_path])

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    request_id = getattr(request, 'request_id', 'N/A')

    # Validate request has files
    if 'file' not in request.files:
        return error_response('NO_FILE', 'No file provided in request', 400)

    # Handle multiple files
    files = request.files.getlist('file')

    if not files or all(f.filename == '' for f in files):
        return error_response('EMPTY_FILE', 'No file selected', 400)

    # Validate and save files
    valid_files = []
    temp_paths = []

    for idx, file in enumerate(files):
        if file.filename == '':
            continue

        # Validate file type
        if not allowed_file(file.filename):
            # Clean up already saved files
            for path in temp_paths:
                try:
                    if os.path.exists(path):
                        os.remove(path)
                except Exception as e:
                    logger.warning(f"[{request_id}] Failed to cleanup temp file: {e}")

            return error_response(
                'INVALID_FILE_TYPE',
                f'Invalid file type for {file.filename}. Allowed: {", ".join(ALLOWED_EXTENSIONS)}',
                400
            )

        # Check file size (additional to Flask's MAX_CONTENT_LENGTH)
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        if file_size > MAX_FILE_SIZE_MB * 1024 * 1024:
            return error_response(
                'FILE_TOO_LARGE',
                f'File {file.filename} exceeds {MAX_FILE_SIZE_MB}MB limit',
                413
            )

        # Save file
        filename = secure_filename(file.filename)
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], f"upload_{uuid.uuid4()}_{filename}")

        try:
            file.save(temp_path)
            valid_files.append(file)
            temp_paths.append(temp_path)
            logger.info(f"[{request_id}] Saved file {idx+1}/{len(files)}: {filename} ({file_size} bytes)")
        except Exception as e:
            logger.error(f"[{request_id}] Failed to save file {filename}: {e}")
            return error_response('FILE_SAVE_FAILED', f'Failed to save {filename}', 500, str(e))

    if not valid_files:
        return error_response('NO_VALID_FILES', 'No valid files provided', 400)

    # Process images
    try:
        logger.info(f"[{request_id}] Processing {len(temp_paths)} images...")
        result = process_images_to_latex(temp_paths)

        # Build response
        response_data = {
            'latex': result['latex'],
            'note_name': result['note_name'],
            'has_pdf': bool(result.get('pdf_path') and os.path.exists(result['pdf_path'])),
            'image_count': len(valid_files),
        }

        if result.get('compilation_error'):
            response_data['compilation_error'] = result['compilation_error']

        logger.info(f"[{request_id}] Successfully processed {len(valid_files)} images")
        return success_response(response_data, 'Images processed successfully')

    except Exception as e:
        logger.error(f"[{request_id}] Processing failed: {str(e)}", exc_info=True)
        return error_response('PROCESSING_FAILED', 'Image processing failed', 500, str(e))

    finally:
        # Clean up uploaded files
        for temp_path in temp_paths:
            try:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                    logger.debug(f"[{request_id}] Cleaned up temp file: {temp_path}")
            except Exception as e:
                logger.warning(f"[{request_id}] Failed to cleanup {temp_path}: {e}")

@app.route('/preview/<note_name>')
def preview_pdf(note_name):
    """Preview the generated PDF file"""
    # Check both possible locations (latexmk may create subdirectory)
    file_path = os.path.join(DOCS_DIR, f"{note_name}.pdf")
    if not os.path.exists(file_path):
        subdir_path = os.path.join(DOCS_DIR, DOCS_DIR, f"{note_name}.pdf")
        if os.path.exists(subdir_path):
            file_path = subdir_path
    
    if os.path.exists(file_path):
        return send_file(file_path, mimetype='application/pdf')
    return jsonify({'error': 'PDF not found'}), 404

@app.route('/history')
def get_history():
    """Get list of all generated notes organized by date"""
    notes = []
    
    # Scan notes_out directory for .tex files
    if os.path.exists(DOCS_DIR):
        for filename in os.listdir(DOCS_DIR):
            if filename.endswith('.tex'):
                note_name = filename[:-4]  # Remove .tex extension
                tex_path = os.path.join(DOCS_DIR, filename)
                
                # Get file modification time
                mtime = os.path.getmtime(tex_path)
                date_created = datetime.fromtimestamp(mtime)
                
                # Extract date from filename if it follows the pattern notes_YYYY-MM-DD_HH-MM-SS
                display_name = note_name
                if note_name.startswith('notes_') and len(note_name) > 6:
                    # Try to parse date from filename
                    try:
                        date_part = note_name[6:]  # Remove 'notes_' prefix
                        
                        # Check if it's a multi-image file (contains 'multi' and number)
                        is_multi = False
                        image_count = None
                        if '_multi' in date_part:
                            parts = date_part.split('_multi')
                            date_part = parts[0]
                            if len(parts) > 1:
                                image_count = parts[1]
                                is_multi = True
                        
                        if '_' in date_part:
                            date_str, time_str = date_part.split('_', 1)
                            parsed_date = datetime.strptime(f"{date_str}_{time_str}", '%Y-%m-%d_%H-%M-%S')
                            if is_multi and image_count:
                                display_name = f"Notes from {parsed_date.strftime('%B %d, %Y at %I:%M %p')} ({image_count} images)"
                            else:
                                display_name = f"Notes from {parsed_date.strftime('%B %d, %Y at %I:%M %p')}"
                    except:
                        # If parsing fails, use the original name
                        pass
                
                # Check if PDF exists
                pdf_path = os.path.join(DOCS_DIR, f"{note_name}.pdf")
                pdf_exists = os.path.exists(pdf_path)
                if not pdf_exists:
                    # Check subdirectory
                    subdir_pdf = os.path.join(DOCS_DIR, DOCS_DIR, f"{note_name}.pdf")
                    pdf_exists = os.path.exists(subdir_pdf)
                
                notes.append({
                    'note_name': note_name,
                    'display_name': display_name,
                    'date_created': date_created.isoformat(),
                    'date_display': date_created.strftime('%B %d, %Y at %I:%M %p'),
                    'date_sort': date_created.strftime('%Y-%m-%d'),
                    'has_pdf': pdf_exists
                })
    
    # Sort by date (newest first)
    notes.sort(key=lambda x: x['date_created'], reverse=True)
    
    # Group by date
    grouped_notes = {}
    for note in notes:
        date_key = note['date_sort']
        if date_key not in grouped_notes:
            grouped_notes[date_key] = {
                'date_display': datetime.fromisoformat(note['date_created']).strftime('%B %d, %Y'),
                'notes': []
            }
        grouped_notes[date_key]['notes'].append(note)
    
    # Convert to list sorted by date (newest first)
    history = [{'date': k, **v} for k, v in sorted(grouped_notes.items(), reverse=True)]
    
    return jsonify({'history': history})

@app.route('/delete/<note_name>', methods=['DELETE'])
def delete_note(note_name):
    """Delete a note and its associated files"""
    deleted_files = []
    errors = []
    
    # Delete .tex file
    tex_path = os.path.join(DOCS_DIR, f"{note_name}.tex")
    if os.path.exists(tex_path):
        try:
            os.remove(tex_path)
            deleted_files.append(f"{note_name}.tex")
        except Exception as e:
            errors.append(f"Failed to delete .tex: {str(e)}")
    
    # Delete .pdf file (check both locations)
    pdf_path = os.path.join(DOCS_DIR, f"{note_name}.pdf")
    if os.path.exists(pdf_path):
        try:
            os.remove(pdf_path)
            deleted_files.append(f"{note_name}.pdf")
        except Exception as e:
            errors.append(f"Failed to delete .pdf: {str(e)}")
    else:
        # Check subdirectory
        subdir_pdf = os.path.join(DOCS_DIR, DOCS_DIR, f"{note_name}.pdf")
        if os.path.exists(subdir_pdf):
            try:
                os.remove(subdir_pdf)
                deleted_files.append(f"{note_name}.pdf")
            except Exception as e:
                errors.append(f"Failed to delete .pdf: {str(e)}")
    
    # Delete auxiliary files (.aux, .log, .fls, .fdb_latexmk)
    aux_extensions = ['.aux', '.log', '.fls', '.fdb_latexmk']
    for ext in aux_extensions:
        aux_path = os.path.join(DOCS_DIR, f"{note_name}{ext}")
        if os.path.exists(aux_path):
            try:
                os.remove(aux_path)
                deleted_files.append(f"{note_name}{ext}")
            except:
                pass  # Ignore errors for auxiliary files
        # Also check subdirectory
        subdir_aux = os.path.join(DOCS_DIR, DOCS_DIR, f"{note_name}{ext}")
        if os.path.exists(subdir_aux):
            try:
                os.remove(subdir_aux)
            except:
                pass
    
    if errors:
        return jsonify({'error': '; '.join(errors), 'deleted': deleted_files}), 500
    
    if not deleted_files:
        return jsonify({'error': 'No files found to delete'}), 404
    
    return jsonify({'success': True, 'deleted': deleted_files})

@app.route('/download/<note_name>')
def download_file(note_name):
    """Download the generated .tex or .pdf file"""
    file_type = request.args.get('type', 'tex')  # 'tex' or 'pdf'
    
    if file_type == 'pdf':
        # Check both possible locations (latexmk may create subdirectory)
        file_path = os.path.join(DOCS_DIR, f"{note_name}.pdf")
        if not os.path.exists(file_path):
            subdir_path = os.path.join(DOCS_DIR, DOCS_DIR, f"{note_name}.pdf")
            if os.path.exists(subdir_path):
                file_path = subdir_path
        if os.path.exists(file_path):
            return send_file(file_path, as_attachment=True, download_name=f"{note_name}.pdf")
    else:
        file_path = os.path.join(DOCS_DIR, f"{note_name}.tex")
        if os.path.exists(file_path):
            return send_file(file_path, as_attachment=True, download_name=f"{note_name}.tex")
    
    return jsonify({'error': 'File not found'}), 404

@app.route('/chat', methods=['POST'])
def chat():
    """Handle math chatbot requests"""
    request_id = getattr(request, 'request_id', 'N/A')

    try:
        data = request.get_json()
        if not data:
            return error_response('INVALID_REQUEST', 'Request body must be JSON', 400)

        message = data.get('message', '').strip()
        if not message:
            return error_response('EMPTY_MESSAGE', 'Message cannot be empty', 400)

        use_llm = data.get('use_llm', True)

        logger.info(f"[{request_id}] Chat request: {message[:50]}... (llm={use_llm})")

        reply = math_engine(message, use_llm=use_llm)
        formatted_reply = format_reply(reply)

        logger.info(f"[{request_id}] Chat reply generated ({len(formatted_reply)} chars)")

        return success_response({
            'reply': formatted_reply,
            'used_llm': use_llm
        })

    except Exception as e:
        logger.error(f"[{request_id}] Chat error: {str(e)}", exc_info=True)
        return error_response('CHAT_FAILED', 'Failed to process chat message', 500, str(e))

@app.route('/feedback', methods=['POST'])
def submit_feedback():
    """
    Collect user feedback on generated LaTeX.

    Expected JSON:
    {
        "note_name": "notes_2025-01-01_12-34-56",
        "rating_transcription": 1-5,
        "rating_explanation": 1-5,
        "corrected_latex": "...optional corrected LaTeX...",
        "comments": "optional free-text comments"
    }
    """
    try:
        data = request.json or {}

        note_name = data.get("note_name", "").strip()
        if not note_name:
            return jsonify({"error": "note_name is required"}), 400

        # Sanitize ratings
        def sanitize_rating(x):
            if x is None:
                return None
            try:
                x = int(x)
                return max(1, min(5, x))
            except:
                return None

        record = {
            "note_name": note_name,
            "rating_transcription": sanitize_rating(data.get("rating_transcription")),
            "rating_explanation": sanitize_rating(data.get("rating_explanation")),
            "corrected_latex": data.get("corrected_latex", ""),
            "comments": data.get("comments", ""),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

        # Store as JSONL (one line per feedback)
        filename = os.path.join(FEEDBACK_DIR, f"{note_name}_feedback.jsonl")
        with open(filename, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

        print(f"[INFO] Saved feedback for {note_name}")
        return jsonify({"success": True, "saved_to": filename})

    except Exception as e:
        print(f"[ERROR] Feedback save failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring and mobile app connectivity testing"""
    return success_response({
        'status': 'healthy',
        'version': '1.0.0',
        'model': MODEL_NAME,
        'timestamp': datetime.now(timezone.utc).isoformat()
    })

if __name__ == '__main__':
    # Startup banner
    logger.info("=" * 50)
    logger.info("LectureToLaTeX Backend Server")
    logger.info("=" * 50)
    logger.info(f"Host: {HOST}")
    logger.info(f"Port: {PORT}")
    logger.info(f"Debug: {DEBUG}")
    logger.info(f"Model: {MODEL_NAME}")
    logger.info(f"Max file size: {MAX_FILE_SIZE_MB}MB")
    logger.info(f"Timeout: {TIMEOUT_SECONDS}s")
    logger.info(f"Docs directory: {DOCS_DIR}")
    logger.info("=" * 50)

    app.run(debug=DEBUG, host=HOST, port=PORT)

