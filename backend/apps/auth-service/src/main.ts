import { NestFactory } from '@nestjs/core';
import { AuthServiceModule } from './auth-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  // Hybrid: TCP 4001 = Nest RPC for api-gateway (must match ClientsModule TCP port).
  // HTTP listen must use another port — listen(4001) alone is Express, not TCP; gateway then gets "Connection closed".
  const app = await NestFactory.create(AuthServiceModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port: 4001 },
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
  const httpPort = Number(process.env.AUTH_HTTP_PORT ?? 4010);
  await app.listen(httpPort);
}
bootstrap();
