import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { storage } from '../services/storage';
import { api } from '../services/api';
import { COLORS } from '../constants/colors';

const { width } = Dimensions.get('window');

export default function CameraScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [photos, setPhotos] = useState([]);
  const [showNameModal, setShowNameModal] = useState(false);
  const [documentName, setDocumentName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    // Show name modal when screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      setShowNameModal(true);
      setPhotos([]);
      setDocumentName('');
    });
    
    return unsubscribe;
  }, [navigation]);

  const handleStartCamera = () => {
    if (!documentName.trim()) {
      Alert.alert('Error', 'Please enter a document name');
      return;
    }
    setShowNameModal(false);
  };

  const takePicture = async () => {
    if (cameraRef.current && cameraReady) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });
        setPhotos([...photos, photo]);
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to take picture');
      }
    }
  };

  const deletePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (photos.length === 0) {
      Alert.alert('Error', 'Please take at least one photo');
      return;
    }

    setProcessing(true);

    try {
      // Upload photos to backend
      const result = await api.uploadPhotos(photos);

      if (result.success) {
        // Save document to local storage
        const document = {
          id: Date.now().toString(),
          name: documentName.trim(),
          filename: result.data.note_name || documentName.trim(),
          created: new Date().toISOString(),
          latexContent: result.data.latex || '',
          pdfAvailable: result.data.has_pdf || false,
        };

        await storage.saveDocument(document);

        Alert.alert('Success', 'Document created successfully!', [
          {
            text: 'OK',
            onPress: () => {
              setPhotos([]);
              setDocumentName('');
              navigation.navigate('Files');
            },
          },
        ]);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Processing error:', error);
      Alert.alert(
        'Error',
        'Failed to process document. Please check your backend connection and try again.',
        [
          { text: 'Cancel', onPress: () => navigation.navigate('Files') },
          { text: 'Retry', onPress: handleSubmit },
        ]
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel',
      'Are you sure you want to cancel? All photos will be lost.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => {
            setPhotos([]);
            setDocumentName('');
            navigation.navigate('Files');
          },
        },
      ]
    );
  };

  const pickImagesFromGallery = async () => {
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant photo library access to select images.'
        );
        return;
      }

      // Launch image picker with multiple selection
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        // Add selected images to photos array
        const newPhotos = result.assets.map(asset => ({
          uri: asset.uri,
        }));
        setPhotos([...photos, ...newPhotos]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to select images from gallery');
    }
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={80} color={COLORS.textSecondary} />
          <Text style={styles.permissionText}>Camera permission required</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Document Name Modal */}
      <Modal visible={showNameModal} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Document</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter document name"
              value={documentName}
              onChangeText={setDocumentName}
              autoFocus={true}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowNameModal(false);
                  navigation.navigate('Files');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.startButton]}
                onPress={handleStartCamera}
              >
                <Text style={styles.startButtonText}>Start</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Processing Modal */}
      <Modal visible={processing} transparent={true} animationType="fade">
        <View style={styles.processingModal}>
          <View style={styles.processingContent}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.processingText}>Extracting text...</Text>
          </View>
        </View>
      </Modal>

      {/* Photo Gallery Modal */}
      <Modal visible={showPhotoGallery} animationType="slide" transparent={true}>
        <View style={styles.galleryModalContainer}>
          <View style={styles.galleryModalContent}>
            <View style={styles.galleryHeader}>
              <Text style={styles.galleryTitle}>{photos.length} Photos</Text>
              <TouchableOpacity onPress={() => setShowPhotoGallery(false)}>
                <Ionicons name="close" size={28} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={photos}
              keyExtractor={(item, index) => index.toString()}
              numColumns={3}
              renderItem={({ item, index }) => (
                <View style={styles.galleryItem}>
                  <Image source={{ uri: item.uri }} style={styles.galleryImage} />
                  <TouchableOpacity
                    style={styles.deleteGalleryPhoto}
                    onPress={() => {
                      deletePhoto(index);
                      if (photos.length === 1) {
                        setShowPhotoGallery(false);
                      }
                    }}
                  >
                    <Ionicons name="trash" size={20} color={COLORS.background} />
                  </TouchableOpacity>
                </View>
              )}
              contentContainerStyle={styles.galleryGrid}
            />
          </View>
        </View>
      </Modal>

      {/* Camera View */}
      <CameraView
        style={styles.camera}
        ref={cameraRef}
        onCameraReady={() => setCameraReady(true)}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topButton} onPress={handleCancel}>
            <Ionicons name="close" size={32} color={COLORS.background} />
          </TouchableOpacity>
          <Text style={styles.photoCount}>{photos.length} photos</Text>
        </View>

        {/* Photo Stack Preview (Top Left) */}
        {photos.length > 0 && (
          <TouchableOpacity
            style={styles.photoStack}
            onPress={() => setShowPhotoGallery(true)}
            activeOpacity={0.8}
          >
            {/* Show up to 3 photos in stack */}
            {photos.slice(0, Math.min(3, photos.length)).map((photo, index) => (
              <View
                key={index}
                style={[
                  styles.stackedPhoto,
                  {
                    top: index * 4,
                    left: index * 4,
                    zIndex: 3 - index,
                  },
                ]}
              >
                <Image source={{ uri: photo.uri }} style={styles.stackedPhotoImage} />
              </View>
            ))}
            {/* Photo count badge */}
            <View style={styles.photoCountBadge}>
              <Text style={styles.photoCountBadgeText}>{photos.length}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Bottom Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.captureButton}
            onPress={takePicture}
            activeOpacity={0.8}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>

          {photos.length > 0 && (
            <TouchableOpacity style={styles.doneButton} onPress={handleSubmit}>
              <Ionicons name="checkmark-circle" size={56} color={COLORS.success} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.filesButton}
            onPress={pickImagesFromGallery}
          >
            <Ionicons name="images" size={28} color={COLORS.background} />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.textPrimary,
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 40,
  },
  permissionText: {
    fontSize: 18,
    color: COLORS.textPrimary,
    marginTop: 20,
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: 30,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  topButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 22,
  },
  photoCount: {
    color: COLORS.background,
    fontSize: 18,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  photoStack: {
    position: 'absolute',
    top: 100,
    left: 20,
    width: 100,
    height: 100,
  },
  stackedPhoto: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: COLORS.background,
    backgroundColor: COLORS.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  stackedPhotoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 9,
  },
  photoCountBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    minWidth: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: COLORS.background,
    zIndex: 10,
  },
  photoCountBadgeText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
  galleryModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'flex-end',
  },
  galleryModalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingTop: 20,
  },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  galleryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  galleryGrid: {
    padding: 10,
  },
  galleryItem: {
    width: (width - 40) / 3,
    height: (width - 40) / 3,
    padding: 5,
    position: 'relative',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  deleteGalleryPhoto: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: COLORS.error,
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'transparent',
    borderWidth: 4,
    borderColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.background,
  },
  doneButton: {
    position: 'absolute',
    right: 40,
    bottom: 10,
  },
  filesButton: {
    position: 'absolute',
    left: 40,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 24,
    width: width - 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.border,
    marginRight: 10,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    marginLeft: 10,
  },
  cancelButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  startButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  processingModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  processingContent: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    width: 280,
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
});
