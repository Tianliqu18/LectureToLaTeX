# LectureToLaTeX Mobile App

A React Native app that converts lecture photos to LaTeX notes using OCR. Take multiple photos of blackboards or whiteboards, or select from your gallery, and automatically generate LaTeX documents.

## Features

- 📸 **Multi-Photo Capture**: Take multiple photos in one session
- 🖼️ **Gallery Picker**: Select multiple photos from your phone's gallery
- 📚 **Photo Stack Preview**: View stacked photos with expandable gallery
- 📄 **LaTeX Conversion**: Automatic OCR and LaTeX generation via backend
- 💾 **Local Storage**: Documents saved locally with AsyncStorage
- 💬 **Math Chatbot**: Ask math questions and get formatted responses
- 🎨 **Clean UI**: Professional interface with smooth animations
- ⚡ **Real-time Processing**: Shows progress while converting

## Prerequisites

- Node.js (v14+)
- npm or yarn
- Expo Go app (for testing on physical device)
- **LectureToLaTeX backend running** (see Backend Setup below)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Backend URL

Edit `utils/config.js` to point to your backend:

```javascript
export const API_CONFIG = {
  BASE_URL: 'http://YOUR_IP_ADDRESS:8000',  // Change this!
};
```

**Important**:
- For iOS simulator: Use `http://localhost:8000`
- For Android emulator: Use `http://10.0.2.2:8000`
- For physical device: Use your computer's IP address (e.g., `http://192.168.1.100:8000`)

### 3. Start Backend

The backend should be running in the `../LectureToLaTeX` directory:

```bash
# In the LectureToLaTeX directory
cd ../LectureToLaTeX
python app.py
```

The backend will run on port 8000 by default.

### 4. Run the App

```bash
npm start
```

Then:
- Scan QR code with Expo Go app on your phone
- Press 'i' for iOS simulator
- Press 'a' for Android emulator

## Usage

### Creating a Document

1. **Tap the Camera tab** in the bottom navigation
2. **Enter a document name** in the modal
3. **Take or select photos**:
   - Tap the large white button to capture photos
   - Tap the gallery button (bottom-left) to select from your phone
   - Photos appear stacked in the top-left corner
   - Tap the stack to view/manage all photos
4. **Tap the green checkmark** when done
5. **Wait for processing** - the app will extract text and generate LaTeX
6. **View your document** in the Files tab

### Managing Photos

- **View all photos**: Tap the photo stack in the top-left corner
- **Delete a photo**: Tap the trash icon on any photo in the gallery view
- **Add more photos**: Use camera or gallery picker

### Using the Chatbot

1. **Tap the Chat tab** in the bottom navigation
2. **Type a math question** (e.g., "What is 2+2?", "Solve x^2 = 4")
3. **Send** - the chatbot will respond with formatted math

### Managing Documents

- **View all documents**: Files tab shows all saved documents
- **Delete a document**: Swipe left on any document
- **Refresh list**: Pull down to refresh

## Project Structure

```
LectureNotesApp/
├── App.js                    # Navigation setup
├── screens/
│   ├── FilesScreen.js       # Document list
│   ├── CameraScreen.js      # Photo capture + gallery picker
│   ├── ChatbotScreen.js     # Math chatbot
│   └── DocumentViewerScreen.js
├── services/
│   ├── api.js               # Backend communication
│   └── storage.js           # AsyncStorage wrapper
├── utils/
│   └── config.js            # Backend URL configuration
├── constants/
│   └── colors.js            # Design system
└── navigation/
    └── FilesStack.js        # Navigation stack
```

## Backend Setup

The app requires the LectureToLaTeX Flask backend. The backend should be in `../LectureToLaTeX`:

### Backend Features:
- OCR with OpenAI GPT-4o Vision API
- LaTeX generation and compilation
- Math chatbot with SymPy
- Image preprocessing with OpenCV
- CORS enabled for mobile apps
- Request ID tracking for debugging

### Backend Configuration:
Create a `.env` file in the backend directory:
```bash
OPENAI_API_KEY=your-openai-api-key-here
MODEL_NAME=gpt-4o
HOST=0.0.0.0
PORT=8000
MAX_FILE_SIZE_MB=16
TIMEOUT_SECONDS=120
```

## API Endpoints

The app uses these backend endpoints:

- `GET /health` - Health check
- `POST /upload` - Upload photos for OCR/LaTeX conversion
- `POST /chat` - Math chatbot queries
- `GET /download/<note_name>?type=tex` - Download LaTeX file
- `GET /history` - Get list of generated notes

## Troubleshooting

### "Upload failed" Error

1. **Check backend is running**: Visit http://YOUR_IP:8000/health in browser
2. **Check IP address**: Make sure `utils/config.js` has correct URL
3. **Check firewall**: Ensure port 8000 is not blocked
4. **Check API key**: Backend needs OPENAI_API_KEY in .env file
5. **Check network**: Phone and computer must be on same network

### Camera Permission Denied

- iOS: Go to Settings → Privacy → Camera → Expo Go → Enable
- Android: Go to Settings → Apps → Expo Go → Permissions → Enable Camera

### Gallery Permission Denied

- iOS: Go to Settings → Privacy → Photos → Expo Go → Enable
- Android: Go to Settings → Apps → Expo Go → Permissions → Enable Storage

### "No documents yet"

This is normal for first run. Tap the Camera tab to create your first document.

### Backend Connection Issues

- Make sure backend shows: `Running on http://YOUR_IP:8000`
- Test health endpoint: `curl http://YOUR_IP:8000/health`
- Check backend logs for errors in `app.log`

## Development Notes

- Photos are compressed to 80% quality before upload
- Maximum 16MB file size per photo
- 120-second timeout for mobile networks
- Documents stored locally survive app restarts
- Request IDs help correlate mobile errors with backend logs
- Gallery picker supports multiple selection

## New Features

### Photo Stack (Latest)
- Photos stack visually in top-left corner
- Shows up to 3 layers with depth effect
- Photo count badge displays total count
- Tap to expand full gallery view
- Delete individual photos from gallery

### Gallery Picker
- Select multiple photos from phone library
- Seamlessly mix camera photos and gallery selections
- Automatic permission handling

## License

Created for educational purposes.

## Repository

https://github.com/Tianliqu18/LectureToLaTeX
