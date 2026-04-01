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
            brokers: ['localhost:9092'],
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
