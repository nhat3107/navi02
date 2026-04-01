import { RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RpcToHttpExceptionFilter } from './common/filters/rpc-exception.filter';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalFilters(new RpcToHttpExceptionFilter());
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'auth/google', method: RequestMethod.ALL },
      { path: 'auth/google/callback', method: RequestMethod.ALL },
      { path: 'auth/github', method: RequestMethod.ALL },
      { path: 'auth/github/callback', method: RequestMethod.ALL },
    ],
  });
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN?.split(',').map((o) => o.trim()) ?? [
      'http://localhost:5173',
    ],
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
