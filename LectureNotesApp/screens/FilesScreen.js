import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { storage } from '../services/storage';
import { COLORS } from '../constants/colors';

export default function FilesScreen({ navigation }) {
  const [documents, setDocuments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDocuments();
    
    // Reload documents when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      loadDocuments();
    });
    
    return unsubscribe;
  }, [navigation]);

  const loadDocuments = async () => {
    const docs = await storage.getDocuments();
    setDocuments(docs);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDocuments();
    setRefreshing(false);
  };

  const handleDelete = (doc) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${doc.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await storage.deleteDocument(doc.id);
            if (success) {
              loadDocuments();
            } else {
              Alert.alert('Error', 'Failed to delete document');
            }
          },
        },
      ]
    );
  };

  const handleOpenDocument = (doc) => {
    navigation.navigate('DocumentViewer', { document: doc });
  };

  const renderDocument = ({ item }) => (
    <TouchableOpacity
      style={styles.documentCard}
      onPress={() => handleOpenDocument(item)}
      onLongPress={() => handleDelete(item)}
      activeOpacity={0.7}
    >
      <View style={styles.fileIcon}>
        <Ionicons name="document-text-outline" size={48} color={COLORS.textPrimary} />
      </View>
      <Text style={styles.fileName}>
        {item.name}
      </Text>
      <Text style={styles.date}>
        {new Date(item.created).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-outline" size={80} color={COLORS.textSecondary} />
      <Text style={styles.emptyText}>No documents yet</Text>
      <Text style={styles.emptySubtext}>
        Tap the + button to create your first note
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>LaTeX Files</Text>
      </View>

      {documents.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={documents}
          renderItem={renderDocument}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
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
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  grid: {
    padding: 20,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  documentCard: {
    width: '48%',
    alignItems: 'center',
  },
  fileIcon: {
    width: 100,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.textPrimary,
    marginBottom: 10,
  },
  fileName: {
    fontSize: 14,
    textAlign: 'center',
    color: COLORS.textPrimary,
  },
  date: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 10,
  },
});
