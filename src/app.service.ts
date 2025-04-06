import { Injectable, Inject, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { Firestore } from '@google-cloud/firestore';
import { FIRESTORE_DB } from './firebase/firebase.constants'; // Adjust path if needed

@Injectable()
export class AppService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AppService.name);

  constructor(@Inject(FIRESTORE_DB) private readonly firestore: Firestore) {}

  // This method runs once the application has fully started
  async onApplicationBootstrap() {
    this.logger.log('Checking Firestore connection...');
    await this.testFirestoreConnection();
  }

  getHello(): string {
    return 'Hello World!';
  }

  async testFirestoreConnection(): Promise<void> {
    try {
      // Attempt a simple, non-critical read.
      // Getting a document reference itself doesn't hit the network,
      // but calling .get() does. Let's try listing collections (requires specific permissions)
      // or getting a non-existent doc which shouldn't error if connection is okay.

      // Option 1: Get a non-existent doc reference (less permission needed)
      const testDoc = this.firestore.collection('_system_health').doc('connection_test');
      await testDoc.get(); // Attempt the read
      this.logger.log('Firestore connection successful.');

      // Option 2: List collections (needs broader permissions)
      // const collections = await this.firestore.listCollections();
      // this.logger.log(`Firestore connection test successful. Found ${collections.length} root collections.`);

    } catch (error) {
      this.logger.error('!!! Firestore connection test FAILED:', error.message || error);
    }
  }
}
