import AsyncStorage from '@react-native-async-storage/async-storage';

const DOCUMENTS_KEY = '@lecture_notes_documents';

export const storage = {
  // Get all documents
  async getDocuments() {
    try {
      const data = await AsyncStorage.getItem(DOCUMENTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading documents:', error);
      return [];
    }
  },

  // Save a new document
  async saveDocument(document) {
    try {
      const documents = await this.getDocuments();
      documents.push(document);
      await AsyncStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents));
      return true;
    } catch (error) {
      console.error('Error saving document:', error);
      return false;
    }
  },

  // Delete a document by ID
  async deleteDocument(id) {
    try {
      const documents = await this.getDocuments();
      const filtered = documents.filter(doc => doc.id !== id);
      await AsyncStorage.setItem(DOCUMENTS_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  },

  // Clear all documents
  async clearAll() {
    try {
      await AsyncStorage.removeItem(DOCUMENTS_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing documents:', error);
      return false;
    }
  },
};
