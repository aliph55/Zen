// utils/AssetManager.js
import { Platform, NativeModules } from 'react-native';
import RNFS from 'react-native-fs';

class AssetManager {
  constructor() {
    this.assetPaths = {
      model: Platform.OS === 'android' ? 'model.onnx' : 'model.onnx',
      vocab: Platform.OS === 'android' ? 'vocab.json' : 'vocab.json',
    };
  }

  async getAssetPath(assetName) {
    try {
      if (Platform.OS === 'android') {
        // Android için asset dosya yolunu oluştur
        const bundlePath = await this.getBundlePath();
        const assetPath = `${bundlePath}/${this.assetPaths[assetName]}`;

        console.log(`Android asset yolu (${assetName}):`, assetPath);
        return assetPath;
      } else {
        // iOS için bundle yolu
        const bundlePath = RNFS.MainBundlePath;
        const assetPath = `${bundlePath}/${this.assetPaths[assetName]}`;

        console.log(`iOS asset yolu (${assetName}):`, assetPath);
        return assetPath;
      }
    } catch (error) {
      console.error('Asset path error:', error);
      throw new Error(`Asset yolu alınamadı: ${assetName}`);
    }
  }

  async getBundlePath() {
    if (Platform.OS === 'android') {
      // Android için farklı yolları dene
      const possiblePaths = [
        RNFS.MainBundlePath,
        `${RNFS.MainBundlePath}/assets`,
        'file:///android_asset',
        '/android_asset',
      ];

      for (const path of possiblePaths) {
        if (path) {
          console.log('Bundle path deneniyor:', path);
          return path;
        }
      }

      // Son çare olarak DocumentDirectory kullan
      console.log('Bundle path bulunamadı, DocumentDirectory kullanılacak');
      return RNFS.DocumentDirectoryPath;
    } else {
      return RNFS.MainBundlePath;
    }
  }

  async copyAssetToDocument(assetName) {
    try {
      if (Platform.OS === 'android') {
        // Android'de asset'i document directory'ye kopyala
        const sourcePath = `bundle-assets://${this.assetPaths[assetName]}`;
        const destPath = `${RNFS.DocumentDirectoryPath}/${this.assetPaths[assetName]}`;

        console.log('Asset kopyalanıyor:', sourcePath, '->', destPath);

        // Dosya zaten varsa skip et
        const exists = await RNFS.exists(destPath);
        if (exists) {
          console.log('Asset zaten mevcut:', destPath);
          return destPath;
        }

        // Asset'i kopyala
        await RNFS.copyFileAssets(this.assetPaths[assetName], destPath);
        console.log('Asset başarıyla kopyalandı:', destPath);

        return destPath;
      } else {
        // iOS için direkt bundle path'i kullan
        return await this.getAssetPath(assetName);
      }
    } catch (error) {
      console.error('Asset copy error:', error);
      throw new Error(`Asset kopyalanamadı: ${assetName} - ${error.message}`);
    }
  }

  async checkAssetExists(assetName) {
    try {
      if (Platform.OS === 'android') {
        // Android'de asset varlığını kontrol et
        const documentPath = `${RNFS.DocumentDirectoryPath}/${this.assetPaths[assetName]}`;
        const exists = await RNFS.exists(documentPath);

        if (exists) {
          console.log("Asset document directory'de bulundu:", documentPath);
          return { exists: true, path: documentPath };
        }

        // Asset'i kopyalamaya çalış
        try {
          const copiedPath = await this.copyAssetToDocument(assetName);
          return { exists: true, path: copiedPath };
        } catch (copyError) {
          console.error('Asset kopyalama hatası:', copyError);
          return { exists: false, path: null, error: copyError.message };
        }
      } else {
        // iOS için bundle path kontrolü
        const assetPath = await this.getAssetPath(assetName);
        const exists = await RNFS.exists(assetPath);

        return { exists, path: exists ? assetPath : null };
      }
    } catch (error) {
      console.error('Asset check error:', error);
      return { exists: false, path: null, error: error.message };
    }
  }

  async listAssets() {
    try {
      if (Platform.OS === 'android') {
        const documentFiles = await RNFS.readDir(RNFS.DocumentDirectoryPath);
        console.log(
          'Document directory files:',
          documentFiles.map(f => f.name),
        );

        return {
          platform: 'android',
          documentPath: RNFS.DocumentDirectoryPath,
          files: documentFiles.map(f => f.name),
        };
      } else {
        const bundleFiles = await RNFS.readDir(RNFS.MainBundlePath);
        console.log(
          'Bundle files:',
          bundleFiles.map(f => f.name),
        );

        return {
          platform: 'ios',
          bundlePath: RNFS.MainBundlePath,
          files: bundleFiles.map(f => f.name),
        };
      }
    } catch (error) {
      console.error('List assets error:', error);
      return { error: error.message };
    }
  }
}

export default AssetManager;
