import { NestFactory } from '@nestjs/core';
import { NetworkServiceModule } from './network-service.module';

async function bootstrap() {
  const app = await NestFactory.create(NetworkServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
