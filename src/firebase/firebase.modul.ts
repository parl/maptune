import { Module, Global, Provider, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigModule, ConfigService } from '@nestjs/config'; // If using ConfigModule
import { FIREBASE_ADMIN, FIRESTORE_DB } from './firebase.constants';
import { Firestore } from '@google-cloud/firestore'; // For typing

const firebaseProvider: Provider = {
  provide: FIREBASE_ADMIN,
  inject: [ConfigService], // Inject ConfigService if using it
  useFactory: (configService: ConfigService) => { // Remove configService param if not using it
    // --- Get credentials ---
    // Using @nestjs/config 
    const logger = new Logger('FirebaseAdmin');
    const serviceAccount = {
      projectId: configService.get<string>('FIREBASE_PROJECT_ID'),
      privateKey: configService.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'), // Handle newline characters if stored in env
      clientEmail: configService.get<string>('FIREBASE_CLIENT_EMAIL'),
    };

    // --- Initialize Firebase ---
    // Check if already initialized to prevent errors during hot-reloading
    if (admin.apps.length === 0) {
        try {
            admin.initializeApp({ /* ... your options ... */ });
            logger.log('Firebase Admin SDK Initialized Successfully.'); // <-- LOG SUCCESS
          } catch (error) {
            logger.error('Firebase Admin SDK Initialization Failed:', error); // <-- LOG FAILURE
            throw error; // Re-throw error to potentially stop app startup if desired
          }
        } else {
            logger.log('Firebase Admin SDK already initialized.');
    }
    return admin;
  },
};
// Provide Firestore specifically for easier injection
const firestoreProvider: Provider = {
    provide: FIRESTORE_DB,
    inject: [FIREBASE_ADMIN], // Depends on the admin app being initialized
    useFactory: (firebaseAdmin: admin.app.App) => {
        const logger = new Logger('Firestore'); // Create a logger instance
        try{
            const db = firebaseAdmin.firestore();
            logger.log('Firestore DB Instance Obtained Successfully.'); // <-- LOG SUCCESS
            return db;
        } catch(error){
            logger.error('Failed to obtain Firestore DB Instance:', error); // <-- LOG FAILURE
            throw error;
        }
      },
};


@Global() // Make Firebase Admin available globally
@Module({
  imports: [ConfigModule], // Import if using ConfigService
  providers: [firebaseProvider, firestoreProvider],
  exports: [FIREBASE_ADMIN, FIRESTORE_DB], // Export the providers
})
export class FirebaseModule {}