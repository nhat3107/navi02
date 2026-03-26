// File này được tạo theo hướng dẫn của document tại: https://docs.nestjs.com/recipes/prisma#use-prisma-client-in-your-nestjs-services

import { Injectable } from '@nestjs/common';
import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string });
    super({ adapter });
  }
}