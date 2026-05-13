import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';
import { config } from './config';
import { logger } from '../utils/logger';

export class Database {
  private static instance: Database;
  private app: App;
  private firestore: Firestore;
  private storage: Storage;

  private constructor() {
    try {
      if (getApps().length === 0) {
        // Log available credential options
        logger.info(`Firebase credential options available:`, {
          hasFirebasePrivateKey: !!config.firebasePrivateKey,
          hasFirebaseClientEmail: !!config.firebaseClientEmail,
          projectId: config.firebaseProjectId,
        });

        if (config.firebasePrivateKey && config.firebaseClientEmail) {
          this.app = initializeApp({
            credential: cert({
              projectId: config.firebaseProjectId,
              privateKey: config.firebasePrivateKey.replace(/\\n/g, '\n'),
              clientEmail: config.firebaseClientEmail,
            }),
            projectId: config.firebaseProjectId,
            storageBucket: config.firebaseStorageBucket,
          });
        } else {
          logger.error(
            'Firebase credentials missing. Check environment variables: FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL'
          );
          throw new Error('Firebase credentials not properly configured');
        }
      } else {
        this.app = getApps()[0];
      }

      this.firestore = getFirestore(this.app);
      this.storage = getStorage(this.app);

      // Configure Firestore settings
      this.firestore.settings({
        ignoreUndefinedProperties: true,
      });

      logger.info('🔥 Firebase initialized');
    } catch (error) {
      logger.error('Error initializing Firebase:', error);
      throw error;
    }
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      try {
        Database.instance = new Database();
      } catch (error) {
        logger.error('Failed to create Database instance:', error);
        throw error;
      }
    }
    return Database.instance;
  }

  public getFirestore(): Firestore {
    return this.firestore;
  }

  public getStorage(): Storage {
    return this.storage;
  }

  public async collection(collectionName: string) {
    return this.firestore.collection(collectionName);
  }

  public async doc(collectionName: string, docId: string) {
    return this.firestore.collection(collectionName).doc(docId);
  }

  public getBucket(bucketName?: string) {
    return this.storage.bucket(bucketName);
  }

  public async testConnection(): Promise<void> {
    try {
      await this.firestore.listCollections();

      logger.info(`✅ Firebase connected (Firestore ready)`);
    } catch (error) {
      logger.error('❌ Firebase connection failed:', error);
      throw error;
    }
  }

  public async close(): Promise<void> {
    logger.info('Closing Firebase connections...');
  }
}

const db = Database.getInstance();

export async function connectDatabase(): Promise<void> {
  try {
    await db.testConnection();
  } catch (error) {
    logger.error('Database connection test failed:', error);
    // Continue execution even if test fails - we might recover later
  }
}

export { db };
export { COLLECTIONS } from './collections';
