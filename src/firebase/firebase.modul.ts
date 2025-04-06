import { Module, Global, Provider, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FIREBASE_ADMIN, FIRESTORE_DB } from './firebase.constants';
import { Firestore } from '@google-cloud/firestore';

const firebaseProvider: Provider = {
  provide: FIREBASE_ADMIN,
  inject: [ConfigService], // Inject ConfigService
  useFactory: (configService: ConfigService) => {
    const logger = new Logger('FirebaseAdmin');

    // --- Get credentials ---
    const projectId = configService.get<string>('FIREBASE_PROJECT_ID');
    const privateKey = configService.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'); // Handle newline characters
    const clientEmail = configService.get<string>('FIREBASE_CLIENT_EMAIL');

    // --- Validate credentials ---
    if (!projectId || !privateKey || !clientEmail) {
      logger.error('Missing Firebase configuration in environment variables (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL)');
      throw new Error('Firebase configuration is incomplete. Check environment variables.');
    }

    // --- Create credential object ---
    const credential = admin.credential.cert({
        projectId,
        privateKey,
        clientEmail,
    });

    // --- Initialize Firebase ---
    if (admin.apps.length === 0) {
        try {
            // ***** PASS THE CREDENTIAL OBJECT HERE *****
            admin.initializeApp({
                credential,
                // You might add other options here if needed, e.g.:
                // databaseURL: configService.get<string>('FIREBASE_DATABASE_URL'),
            });
            // ********************************************
            logger.log('Firebase Admin SDK Initialized Successfully.');
          } catch (error) {
            logger.error('Firebase Admin SDK Initialization Failed:', error);
            throw error;
          }
        } else {
            logger.log('Firebase Admin SDK already initialized.');
    }
    return admin; // Return the initialized admin instance or namespace
  },
};

// Provide Firestore specifically for easier injection
// NO CHANGE NEEDED HERE - It relies on the admin app being correctly initialized above
const firestoreProvider: Provider = {
    provide: FIRESTORE_DB,
    inject: [FIREBASE_ADMIN], // Depends on the admin app being initialized
    useFactory: (firebaseAdmin: admin.app.App | typeof admin) => { // Type can be admin namespace or specific app
        const logger = new Logger('Firestore');
        try{
             // Check if firebaseAdmin is the namespace or an app instance
             const app = firebaseAdmin && typeof (firebaseAdmin as admin.app.App).firestore === 'function'
                       ? (firebaseAdmin as admin.app.App)
                       : admin.app(); // Get default app if namespace was returned

             const db = app.firestore();
             // Alternatively, if firebaseProvider always returns the namespace:
             // const db = admin.firestore();

            logger.log('Firestore DB Instance Obtained Successfully.');
            return db;
        } catch(error){
            logger.error('Failed to obtain Firestore DB Instance:', error);
            throw error;
        }
      },
};


@Global() // Make Firebase Admin available globally
@Module({
  imports: [ConfigModule], // Import if using ConfigService - Ensure ConfigModule.forRoot is called in AppModule
  providers: [firebaseProvider, firestoreProvider],
  exports: [FIREBASE_ADMIN, FIRESTORE_DB], // Export the providers
})
export class FirebaseModule {}