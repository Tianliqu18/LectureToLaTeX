# Backend Troubleshooting Guide

This guide helps diagnose and fix common issues with the Flask backend.

## 🔍 Quick Diagnostics

### 1. Check if server is running

```bash
curl http://localhost:8000/
```

**Expected:** HTML response or 200 status
**If fails:** Server is not running or wrong port

### 2. Test chat endpoint

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "2+2", "use_llm": false}'
```

**Expected:** `{"success": true, "reply": "$$4$$"}`
**If fails:** See error message for details

### 3. Check API key

```bash
echo $OPENAI_API_KEY
```

Should print your API key. If empty, set it:
```bash
export OPENAI_API_KEY="sk-your-key-here"
```

## 🐛 Common Issues

### Issue 1: Server won't start

**Symptoms:**
- `python app.py` crashes immediately
- ImportError or ModuleNotFoundError

**Solution:**
```bash
# Reinstall dependencies
pip install -r requirements.txt

# If using conda
conda install flask openai pillow opencv-python numpy

# Verify Python version (needs 3.8+)
python --version
```

### Issue 2: Port already in use

**Symptoms:**
```
OSError: [Errno 48] Address already in use
```

**Solution:**
```bash
# Find process using port 8000
lsof -i :8000

# Kill the process (replace PID)
kill -9 <PID>

# Or use different port in app.py:
# app.run(debug=True, host='0.0.0.0', port=8001)
```

### Issue 3: OpenAI API errors

**Symptoms:**
- "Invalid API key"
- "Rate limit exceeded"
- "Model not found"

**Solution:**
```bash
# 1. Verify API key is set
echo $OPENAI_API_KEY

# 2. Test API key directly
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# 3. Check you have GPT-4o access
# - Log into platform.openai.com
# - Check your plan includes GPT-4o
# - Verify billing is active

# 4. Check rate limits
# - You may be hitting rate limits
# - Wait a few minutes and retry
```

### Issue 4: Chat returns errors

**Symptoms:**
- "Processing failed" in response
- 500 Internal Server Error

**Solutions:**

**A. SymPy not installed:**
```bash
pip install sympy
```

**B. Invalid math expression:**
```bash
# Try simpler expression first
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "2+2", "use_llm": false}'
```

**C. LLM disabled but needed:**
```bash
# Enable LLM
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "explain derivatives", "use_llm": true}'
```

### Issue 5: Image upload fails

**Symptoms:**
- Upload returns 400/500 error
- "Invalid file type" error

**Solutions:**

**A. Check file size (max 16MB):**
```python
# In app.py, increase if needed:
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32MB
```

**B. Check file format:**
- Supported: PNG, JPG, JPEG, GIF, BMP
- Not supported: HEIC, TIFF, SVG

**C. Check image processing:**
```bash
# Test denoising pipeline separately
python -c "
from denoise_pipeline import run_denoise
import tempfile
import os

# Test with sample image
paths = run_denoise('path/to/test/image.jpg', tempfile.gettempdir())
print('Enhanced:', paths['enhanced'])
"
```

### Issue 6: Mobile app can't connect

**Symptoms:**
- Network error in mobile app
- Connection timeout

**Solutions:**

**A. Check server is accessible:**
```bash
# On your computer, get IP address
ifconfig | grep "inet " | grep -v 127.0.0.1

# Test from mobile device browser:
# http://YOUR_IP:8000
```

**B. Firewall blocking:**
```bash
# macOS - allow incoming connections
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/python3
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock /usr/local/bin/python3

# Linux - allow port
sudo ufw allow 8000
```

**C. Using wrong host:**
```python
# In app.py, verify:
app.run(debug=True, host='0.0.0.0', port=8000)
# NOT:
# app.run(debug=True, host='localhost', port=8000)
```

**D. Mobile app config:**
```javascript
// LectureNotesApp/utils/config.js
export const API_CONFIG = {
  // iOS Simulator:
  BASE_URL: 'http://localhost:8000',

  // Android Emulator:
  BASE_URL: 'http://10.0.2.2:8000',

  // Physical Device (replace with your IP):
  BASE_URL: 'http://192.168.1.XXX:8000',
};
```

### Issue 7: LaTeX compilation fails

**Symptoms:**
- LaTeX generated but no PDF
- "latexmk not found"
- PDF compilation errors

**Solutions:**

**A. Install LaTeX:**
```bash
# macOS
brew install --cask mactex

# Ubuntu/Debian
sudo apt-get install texlive-full

# Windows
# Download MiKTeX from https://miktex.org/
```

**B. Verify installation:**
```bash
which pdflatex
which latexmk
```

**C. Check LaTeX syntax:**
```bash
# The backend generates LaTeX, you can view it in notes_out/
cat notes_out/notes_*.tex

# Compile manually to see errors
cd notes_out
pdflatex notes_*.tex
```

## 🔧 Advanced Debugging

### Enable verbose logging

```python
# In app.py, add at the top:
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Test individual components

**Test OCR pipeline:**
```python
from app import process_image_to_latex

result = process_image_to_latex('path/to/image.jpg')
print(result['latex'])
```

**Test chatbot:**
```python
from math_chatbot import math_engine

response = math_engine("derivative of x^2", use_llm=False)
print(response)
```

### Monitor API usage

```bash
# Check OpenAI API usage
curl https://api.openai.com/v1/usage \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

## 📊 Performance Issues

### Slow response times

**Solutions:**
1. **Reduce image size before upload**
2. **Use faster model** (if available)
3. **Enable caching** for common queries
4. **Increase timeout** in mobile app:
   ```javascript
   // services/api.js
   timeout: 120000, // 2 minutes
   ```

### Memory issues

**Solutions:**
```bash
# Monitor memory usage
top -pid $(pgrep -f "python app.py")

# Reduce image resolution in denoise_pipeline.py
# Limit concurrent requests
```

## 🆘 Getting Help

If issues persist:

1. **Check backend logs:**
   ```bash
   python app.py 2>&1 | tee backend.log
   ```

2. **Check mobile app logs:**
   - Use Expo developer tools
   - Check console for errors

3. **Test with minimal example:**
   ```bash
   # Simple test without mobile app
   curl -X POST http://localhost:8000/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "1+1", "use_llm": false}'
   ```

4. **Check dependencies versions:**
   ```bash
   pip freeze > current_versions.txt
   ```

5. **Create issue with:**
   - Error messages
   - Backend logs
   - Steps to reproduce
   - Environment info (OS, Python version, etc.)

## ✅ Verification Checklist

Before reporting issues, verify:

- [ ] Python 3.8+ installed
- [ ] All dependencies installed (`pip install -r requirements.txt`)
- [ ] OpenAI API key set and valid
- [ ] Server starts without errors
- [ ] Can access http://localhost:8000 in browser
- [ ] Port 8000 not blocked by firewall
- [ ] Mobile app has correct BASE_URL
- [ ] Devices on same network (for physical device)
- [ ] LaTeX installed (if using PDF generation)

## 🔄 Reset to Clean State

If all else fails:

```bash
# 1. Stop server
pkill -f "python app.py"

# 2. Clean Python cache
find . -type d -name __pycache__ -exec rm -r {} +
find . -type f -name "*.pyc" -delete

# 3. Reinstall dependencies
pip uninstall -r requirements.txt -y
pip install -r requirements.txt

# 4. Clear generated files
rm -rf notes_out/*
rm -rf notes_feedback/*

# 5. Restart server
python app.py
```
