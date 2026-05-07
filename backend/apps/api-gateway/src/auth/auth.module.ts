import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { isGithubOAuthConfigured, isGoogleOAuthConfigured } from './oauth-env';

const oauthStrategies = [
  ...(isGoogleOAuthConfigured() ? [GoogleStrategy] : []),
  ...(isGithubOAuthConfigured() ? [GithubStrategy] : []),
];

function kafkaBrokers(): string[] {
  return (process.env.KAFKA_BROKERS ?? 'localhost:9092')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

@Module({
  imports: [
    PassportModule,
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'api-gateway-auth',
            brokers: kafkaBrokers(),
          },
          consumer: {
            groupId: 'api-gateway-auth-reply',
          },
        },
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, ...oauthStrategies],
})
export class AuthModule {}
