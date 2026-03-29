import { NestFactory } from '@nestjs/core';
import { AuthServiceModule } from './auth-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  // Thiết lập để ứng dụng có thể lắng nghe cả TCP và Kafka
  // Xem hướng dẫn tại: https://docs.nestjs.com/faq/hybrid-application (Tài liệu chính thức của NestJS phần FAQ mục Hybrid Application)
  const app = await NestFactory.create(AuthServiceModule);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      port: 4001,
    },
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'auth',
        brokers: ['localhost:9092'],
      },
      consumer: {
        groupId: 'auth-consumer',
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(4001);
}
bootstrap();
