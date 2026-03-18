import { NestFactory } from '@nestjs/core';
import { AuthServiceModule } from './auth-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AuthServiceModule,{
      transport: Transport.KAFKA,
      options: {
        client: {
          clientid: 'auth',
          brokers: ['localhost:9092'],
        },
        consumer: { 
          groupId: 'auth-consumer'
        },
      }
    }
  );
  await app.listen();
}
bootstrap();
