import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { api } from '../services/api';

export default function DocumentViewerScreen({ route, navigation }) {
  const { document } = route.params;
  const [viewMode, setViewMode] = useState('latex'); // 'latex' or 'pdf'

  const handleShare = async () => {
    try {
      await Share.share({
        message: document.latexContent,
        title: document.name,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleDownload = async () => {
    try {
      const result = await api.downloadLatex(document.filename);
      if (result.success) {
        Alert.alert('Success', 'LaTeX file downloaded');
      } else {
        Alert.alert('Error', 'Failed to download file');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to download file');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {document.name}
        </Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* View Mode Toggle */}
      {document.pdfAvailable && (
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'latex' && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode('latex')}
          >
            <Text
              style={[
                styles.toggleText,
                viewMode === 'latex' && styles.toggleTextActive,
              ]}
            >
              LaTeX
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'pdf' && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode('pdf')}
          >
            <Text
              style={[
                styles.toggleText,
                viewMode === 'pdf' && styles.toggleTextActive,
              ]}
            >
              PDF
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {viewMode === 'latex' ? (
          <View style={styles.latexContainer}>
            <Text style={styles.latexText}>{document.latexContent}</Text>
          </View>
        ) : (
          <View style={styles.pdfContainer}>
            <Text style={styles.pdfPlaceholder}>
              PDF preview not available in React Native.
              {'\n\n'}
              Use the download button to save and view the PDF on your device.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleDownload}>
          <Ionicons name="download-outline" size={24} color={COLORS.background} />
          <Text style={styles.actionText}>Download</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 4,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  shareButton: {
    padding: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    margin: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.background,
  },
  toggleText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  toggleTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  latexContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
  },
  latexText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  pdfContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfPlaceholder: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  actions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
  },
  actionText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
