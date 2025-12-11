# Integration Guide: LectureToLaTeX Backend + LectureNotesApp Frontend

This guide explains how to run the integrated OCR pipeline and chatbot system.

## Architecture

The system consists of two parts:
- **LectureToLaTeX**: Flask backend with GPT-4o Vision OCR pipeline and math chatbot
- **LectureNotesApp**: React Native (Expo) mobile app

## Backend Setup (LectureToLaTeX)

### 1. Install Python dependencies

```bash
cd LectureToLaTeX
pip install -r requirements.txt
```

### 2. Set up environment variables

You need an OpenAI API key for the GPT-4o Vision API and math chatbot:

```bash
export OPENAI_API_KEY="your-openai-api-key-here"
```

Alternatively, you can use DeepSeek API:
```bash
export DEEPSEEK_API_KEY="your-deepseek-api-key-here"
```

### 3. Run the Flask server

```bash
python app.py
```

The backend will run on `http://localhost:8000`

## Frontend Setup (LectureNotesApp)

### 1. Install dependencies

```bash
cd LectureNotesApp
npm install
```

This will install all required packages including:
- React Navigation (tabs + stack)
- Expo Camera
- Axios for API calls
- AsyncStorage for local data

### 2. Configure API endpoint

Edit `LectureNotesApp/utils/config.js` and update the `BASE_URL`:

```javascript
export const API_CONFIG = {
  BASE_URL: 'http://YOUR_COMPUTER_IP:8000',
  // For iOS simulator: http://localhost:8000
  // For Android emulator: http://10.0.2.2:8000
  // For physical device: http://YOUR_COMPUTER_IP:8000
};
```

**Important**:
- If testing on a physical device, use your computer's local IP address
- Make sure both devices are on the same WiFi network
- Find your IP with `ifconfig` (Mac/Linux) or `ipconfig` (Windows)

### 3. Run the app

```bash
npm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app for physical device

## Features

### 1. Camera & OCR
- Tap the `+` button to create a new document
- Take photos of blackboard/whiteboard math notes
- Backend processes images through:
  - Denoising pipeline
  - GPT-4o Vision API
  - LaTeX generation with explanations

### 2. Files Management
- View all processed documents
- Tap to open and view LaTeX source
- Long press to delete
- Download LaTeX files

### 3. Math Chatbot
- Tap the calculator icon
- Ask math questions like:
  - "derivative of sin(x)^2"
  - "integrate x^2 from 0 to 1"
  - "solve x^2 - 5x + 6 = 0"
  - "explain eigenvalues"
- Uses SymPy for symbolic computation
- GPT-4o for explanations and concept clarifications

## Backend API Endpoints

The frontend uses these endpoints:

- `POST /upload` - Upload photos for OCR processing
- `POST /chat` - Send math questions to chatbot
- `GET /history` - Get list of all notes
- `GET /preview/<note_name>` - Preview PDF
- `GET /download/<note_name>?type=tex` - Download LaTeX file
- `DELETE /delete/<note_name>` - Delete note

## Troubleshooting

### Backend Issues

1. **ImportError**: Make sure all dependencies are installed:
   ```bash
   pip install -r requirements.txt
   ```

2. **OpenAI API errors**: Verify your API key is set:
   ```bash
   echo $OPENAI_API_KEY
   ```

3. **Port already in use**: Change the port in `app.py`:
   ```python
   app.run(debug=True, host='localhost', port=8001)
   ```

### Frontend Issues

1. **Cannot connect to backend**:
   - Check `utils/config.js` has correct IP
   - Verify backend is running
   - Check firewall settings

2. **Camera permission denied**:
   - Grant camera permissions when prompted
   - Check device settings if needed

3. **Module not found**: Run `npm install` again

4. **Navigation errors**:
   - Make sure you installed the stack navigator:
   ```bash
   npm install @react-navigation/native-stack
   ```

## File Structure

### Backend (LectureToLaTeX)
```
LectureToLaTeX/
├── app.py                 # Main Flask application
├── math_chatbot.py        # Math chatbot with SymPy
├── denoise_pipeline.py    # Image preprocessing
├── requirements.txt       # Python dependencies
└── notes_out/            # Generated LaTeX/PDF files
```

### Frontend (LectureNotesApp)
```
LectureNotesApp/
├── App.js                 # Main app with tab navigation
├── navigation/
│   └── FilesStack.js      # Stack navigator for Files tab
├── screens/
│   ├── CameraScreen.js    # Camera & photo capture
│   ├── FilesScreen.js     # Document list
│   ├── ChatbotScreen.js   # Math chatbot interface
│   └── DocumentViewerScreen.js  # LaTeX viewer
├── services/
│   ├── api.js            # API calls to backend
│   └── storage.js        # Local AsyncStorage
└── utils/
    └── config.js         # API endpoint configuration
```

## Next Steps

1. Start the Flask backend
2. Configure the frontend API endpoint
3. Install frontend dependencies
4. Run the Expo app
5. Try capturing some math notes!
