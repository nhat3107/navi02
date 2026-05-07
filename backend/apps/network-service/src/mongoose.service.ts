// Tham khảo từ: https://docs.nestjs.com/techniques/mongodb#async-configuration
import { Injectable } from "@nestjs/common";
import { MongooseModuleOptions, MongooseOptionsFactory } from "@nestjs/mongoose";

@Injectable()
export class MongooseConfigService implements MongooseOptionsFactory {
  createMongooseOptions(): MongooseModuleOptions {
    return {
      uri: process.env.NETWORK_DB_URL,
    };
  }
}
