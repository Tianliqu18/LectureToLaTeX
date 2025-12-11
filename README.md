# LectureToLaTeX

A complete system for converting handwritten lecture notes to LaTeX documents using AI-powered OCR, consisting of a Flask backend and React Native mobile app.

## 🚀 Features

- **📸 Multi-Photo Capture**: Take multiple photos of blackboards/whiteboards
- **🖼️ Gallery Picker**: Select photos from your phone's library
- **📄 LaTeX Conversion**: Automatic OCR and LaTeX generation via GPT-4o Vision
- **💬 Math Chatbot**: Interactive math helper powered by SymPy and GPT-4o
- **📱 Cross-Platform**: Works on iOS and Android
- **💾 Local Storage**: Documents saved locally on device

## 📁 Project Structure

```
genapp/
├── LectureNotesApp/          # React Native mobile app
│   ├── screens/              # App screens (Camera, Files, Chat, Viewer)
│   ├── services/             # API & storage services
│   ├── navigation/           # Navigation configuration
│   └── utils/                # Config and utilities
│
└── LectureToLaTeX/           # Flask backend server
    ├── app.py                # Main Flask application
    ├── math_chatbot.py       # SymPy-powered math assistant
    ├── denoise_pipeline.py   # Image preprocessing
    ├── templates/            # Web interface
    ├── notes_out/            # Generated LaTeX/PDF files
    └── requirements.txt      # Python dependencies
```

## 🛠️ Quick Start

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd LectureToLaTeX
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set OpenAI API key**
   ```bash
   export OPENAI_API_KEY="your-openai-api-key"
   ```

4. **Run server**
   ```bash
   python app.py
   ```
   Server runs on `http://0.0.0.0:8000`

### Mobile App Setup

1. **Navigate to app directory**
   ```bash
   cd LectureNotesApp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure backend URL**

   Edit `utils/config.js`:
   ```javascript
   export const API_CONFIG = {
     BASE_URL: 'http://YOUR_IP_ADDRESS:8000',
   };
   ```

   Replace `YOUR_IP_ADDRESS` with:
   - `localhost` for iOS simulator
   - `10.0.2.2` for Android emulator
   - Your computer's IP address for physical devices

4. **Run app**
   ```bash
   npm start
   ```
   Then scan the QR code with Expo Go or press `i`/`a` for simulator

## 📱 Usage

### Creating Notes

1. Tap the **Camera tab** in bottom navigation
2. Enter a document name in the modal
3. Take photos or select from gallery
4. Tap the green checkmark when done
5. Wait for processing
6. View your LaTeX document in the **Files tab**

### Math Chatbot

1. Tap the **Chat tab** in bottom navigation
2. Ask math questions like:
   - "derivative of sin(x)^2"
   - "integrate x^2 from 0 to 1"
   - "solve x^2 - 5x + 6 = 0"
3. Get formatted mathematical responses

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/upload` | POST | Upload photos for OCR/LaTeX conversion |
| `/chat` | POST | Math chatbot queries |
| `/history` | GET | Get list of generated notes |
| `/download/<note_name>` | GET | Download LaTeX/PDF files |

## 📚 Documentation

- **[LectureNotesApp/README.md](LectureNotesApp/README.md)** - Mobile app documentation
- **[LectureToLaTeX/README.md](LectureToLaTeX/README.md)** - Backend documentation
- **[LectureToLaTeX/BACKEND_TROUBLESHOOTING.md](LectureToLaTeX/BACKEND_TROUBLESHOOTING.md)** - Backend troubleshooting guide

## Prerequisites

- **Backend**: Python 3.8+, OpenAI API key with GPT-4o access
- **Mobile App**: Node.js 16+, Expo CLI, iOS/Android device or simulator

## 🐛 Troubleshooting

### Backend won't start
- Check OpenAI API key is set correctly
- Ensure all Python dependencies are installed
- Check port 8000 is not in use

### Mobile app can't connect to backend
- Verify backend is running (`curl http://YOUR_IP:8000/health`)
- Check `utils/config.js` has correct IP address
- Ensure phone and computer are on same network
- Check firewall isn't blocking port 8000

### Camera/Gallery permissions denied
- iOS: Settings → Privacy → Camera/Photos → Expo Go → Enable
- Android: Settings → Apps → Expo Go → Permissions → Enable

## 🙏 Acknowledgments

- OpenAI GPT-4o Vision API for OCR
- SymPy for symbolic mathematics
- React Native & Expo for mobile development
- Flask for backend server

## 📄 License

Created for educational purposes.
