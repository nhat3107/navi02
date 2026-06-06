import { RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import { RpcToHttpExceptionFilter } from './common/filters/rpc-exception.filter';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));
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
      'http://localhost:5174',
    ],
    credentials: true,
  });
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`API gateway listening on 0.0.0.0:${port}`);
}
bootstrap().catch((err) => {
  console.error('api-gateway bootstrap failed:', err);
  process.exit(1);
});
