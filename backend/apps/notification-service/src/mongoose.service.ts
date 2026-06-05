import { Injectable } from '@nestjs/common';
import { MongooseModuleOptions, MongooseOptionsFactory } from '@nestjs/mongoose';

@Injectable()
export class MongooseConfigService implements MongooseOptionsFactory {
  createMongooseOptions(): MongooseModuleOptions {
    const uri = process.env.DATABASE_URL?.trim();
    if (!uri) {
      throw new Error('DATABASE_URL must be set (NOTIFICATION_DATABASE_URL in deploy config)');
    }
    return { uri };
  }
}
