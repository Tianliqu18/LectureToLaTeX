# Testing Checklist

## Prerequisites
- [ ] Backend is running (`cd LectureToLaTeX && python app.py`)
- [ ] Frontend dependencies installed (`cd LectureNotesApp && npm install`)
- [ ] OpenAI API key is set (`export OPENAI_API_KEY=...`)
- [ ] API endpoint configured in `LectureNotesApp/utils/config.js`

## Backend Tests

### Start the Flask Server
```bash
cd LectureToLaTeX
python app.py
```

Expected output: `Running on http://localhost:8000`

### Test OCR Endpoint
```bash
curl http://localhost:8000/
```

Should return the web interface HTML or a 200 status.

### Test Chat Endpoint
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "derivative of x^2", "use_llm": true}'
```

Expected response:
```json
{
  "success": true,
  "reply": "$$\\frac{d}{dx}\\,x^{2} = 2 x$$"
}
```

## Frontend Tests

### 1. Start the App
```bash
cd LectureNotesApp
npm start
```

Then open in iOS/Android simulator or scan QR code.

### 2. Test Navigation
- [ ] App loads with 3 tabs: Files, Camera (+), Chat
- [ ] Can navigate between all tabs
- [ ] Tab icons display correctly

### 3. Test Camera Screen
- [ ] Tap the `+` button
- [ ] Name modal appears
- [ ] Enter a document name (e.g., "Test Document")
- [ ] Camera view opens
- [ ] Can take multiple photos
- [ ] Photos appear as thumbnails
- [ ] Can delete individual photos
- [ ] Submit button appears after taking photos
- [ ] Loading indicator appears during processing
- [ ] Success message shows after processing
- [ ] Navigates to Files screen after success

### 4. Test Files Screen
- [ ] New document appears in the list
- [ ] Document shows correct name and date
- [ ] Tap document to open viewer
- [ ] Long press to delete (confirmation dialog appears)

### 5. Test Document Viewer
- [ ] Opens when tapping a document
- [ ] Shows document name in header
- [ ] LaTeX content displays in monospace font
- [ ] Share button works
- [ ] Download button triggers download
- [ ] Back button returns to files list

### 6. Test Chatbot Screen
- [ ] Opens from Chat tab
- [ ] Welcome message appears
- [ ] Suggested questions appear
- [ ] Can tap suggestion to fill input
- [ ] Can type custom question
- [ ] Send button is disabled when input is empty
- [ ] Message appears in chat after sending
- [ ] Loading indicator shows while waiting for response
- [ ] Bot response appears with proper formatting
- [ ] LaTeX in responses is readable

### 7. Test Error Handling

#### Backend Offline
- [ ] Turn off Flask server
- [ ] Try to upload photos
- [ ] Error message appears
- [ ] Try to send chat message
- [ ] Error message appears

#### Invalid Inputs
- [ ] Try to submit camera with 0 photos → Error alert
- [ ] Try to send empty chat message → Send button disabled
- [ ] Try to create document with no name → Error alert

## Integration Tests

### Full OCR Flow
1. [ ] Start backend with valid API key
2. [ ] Open app and tap Camera (+)
3. [ ] Enter name: "Calculus Notes"
4. [ ] Take 2-3 photos of math content (handwritten or printed)
5. [ ] Submit photos
6. [ ] Wait for processing (should take 10-30 seconds)
7. [ ] Success message appears
8. [ ] Navigate to Files
9. [ ] New document "Calculus Notes" appears
10. [ ] Tap to open
11. [ ] LaTeX content is visible and correct
12. [ ] Math notation is properly formatted

### Chat Flow
1. [ ] Navigate to Chat tab
2. [ ] Type: "derivative of sin(x)^2"
3. [ ] Send message
4. [ ] Wait for response
5. [ ] Response shows LaTeX: $$\frac{d}{dx}\sin^2(x) = 2\sin(x)\cos(x)$$
6. [ ] Try: "explain eigenvalues"
7. [ ] Receives explanation with bullet points

### Persistence
1. [ ] Create a document via camera
2. [ ] Close the app completely
3. [ ] Reopen the app
4. [ ] Navigate to Files
5. [ ] Document still appears in list
6. [ ] Can still open and view document

## Performance Tests

- [ ] App loads in < 3 seconds
- [ ] Camera opens in < 1 second
- [ ] Photo capture is instant
- [ ] OCR processing completes in < 60 seconds for 1 image
- [ ] Chat responses arrive in < 10 seconds
- [ ] Navigation transitions are smooth

## Device-Specific Tests

### iOS
- [ ] Test on iOS simulator
- [ ] Camera permissions work
- [ ] Keyboard behavior is correct
- [ ] Share sheet works

### Android
- [ ] Test on Android emulator
- [ ] Camera permissions work
- [ ] Keyboard behavior is correct
- [ ] Share intent works

## Known Limitations

1. PDF preview not available in React Native (displays message)
2. Backend must be running locally or on accessible network
3. Requires active internet for GPT-4o API calls
4. Large images may take longer to process

## Common Issues

### Issue: "Network Error" in app
**Solution**: Check API_CONFIG.BASE_URL in utils/config.js

### Issue: Chat returns error
**Solution**: Verify OPENAI_API_KEY is set and valid

### Issue: Camera won't open
**Solution**: Grant camera permissions in device settings

### Issue: OCR fails
**Solution**:
- Check backend logs for errors
- Verify image quality
- Check API key has GPT-4o access
