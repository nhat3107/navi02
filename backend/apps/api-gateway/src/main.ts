import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RpcToHttpExceptionFilter } from './nestjs/filters/rpc-exception.filter';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalFilters(new RpcToHttpExceptionFilter());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
