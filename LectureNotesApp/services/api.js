import axios from 'axios';
import { API_CONFIG } from '../utils/config';

export const api = {
  // Upload photos to backend for OCR and LaTeX conversion
  async uploadPhotos(photos) {
    try {
      const formData = new FormData();

      // Add each photo to form data
      photos.forEach((photo, index) => {
        formData.append('file', {
          uri: photo.uri,
          type: 'image/jpeg',
          name: `photo_${index}.jpg`,
        });
      });

      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'X-Request-ID': `mobile-${Date.now()}`,
          },
          timeout: 120000, // 120 second timeout to match backend
        }
      );

      // Handle new response format
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message,
        };
      } else {
        return {
          success: false,
          error: response.data.error?.message || 'Upload failed',
          errorCode: response.data.error?.code,
          requestId: response.data.error?.request_id,
        };
      }
    } catch (error) {
      console.error('Upload error:', error);

      // Parse backend error format
      const errorData = error.response?.data?.error;
      return {
        success: false,
        error: errorData?.message || error.message || 'Upload failed',
        errorCode: errorData?.code,
        requestId: errorData?.request_id,
      };
    }
  },

  // Download LaTeX file
  async downloadLatex(noteName) {
    try {
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/download/${noteName}?type=tex`
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Check if backend is reachable
  async checkConnection() {
    try {
      await axios.get(`${API_CONFIG.BASE_URL}/`, { timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  },

  // Health check endpoint
  async checkHealth() {
    try {
      const response = await axios.get(`${API_CONFIG.BASE_URL}/health`, {
        timeout: 5000,
      });
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Send chat message to math chatbot
  async sendChatMessage(message, useLLM = true) {
    try {
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/chat`,
        {
          message: message,
          use_llm: useLLM,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': `mobile-chat-${Date.now()}`,
          },
          timeout: 30000, // 30 second timeout
        }
      );

      // Handle new response format
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
        };
      } else {
        return {
          success: false,
          error: response.data.error?.message || 'Chat failed',
          errorCode: response.data.error?.code,
          requestId: response.data.error?.request_id,
        };
      }
    } catch (error) {
      console.error('Chat error:', error);

      // Parse backend error format
      const errorData = error.response?.data?.error;
      return {
        success: false,
        error: errorData?.message || error.message || 'Chat request failed',
        errorCode: errorData?.code,
        requestId: errorData?.request_id,
      };
    }
  },

  // Get history of notes
  async getHistory() {
    try {
      const response = await axios.get(`${API_CONFIG.BASE_URL}/history`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Preview PDF
  async previewPDF(noteName) {
    try {
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/preview/${noteName}`,
        {
          responseType: 'blob',
        }
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Delete note
  async deleteNote(noteName) {
    try {
      const response = await axios.delete(
        `${API_CONFIG.BASE_URL}/delete/${noteName}`
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};
