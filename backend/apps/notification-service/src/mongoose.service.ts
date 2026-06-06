import { Injectable } from '@nestjs/common';
import { MongooseModuleOptions, MongooseOptionsFactory } from '@nestjs/mongoose';

@Injectable()
export class MongooseConfigService implements MongooseOptionsFactory {
  createMongooseOptions(): MongooseModuleOptions {
    const uri = process.env.DATABASE_URL?.trim();
    if (!uri) {
      throw new Error('DATABASE_URL must be set (NOTIFICATION_DATABASE_URL in deploy config)');
    }
    return {
      uri,
      serverSelectionTimeoutMS: 60_000,
      connectTimeoutMS: 30_000,
      socketTimeoutMS: 45_000,
      family: 4,
      autoIndex: false,
      maxPoolSize: 10,
    };
  }
}
