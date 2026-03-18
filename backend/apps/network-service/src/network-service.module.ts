import { Module } from '@nestjs/common';
import { NetworkServiceController } from './network-service.controller';
import { NetworkServiceService } from './network-service.service';

@Module({
  imports: [],
  controllers: [NetworkServiceController],
  providers: [NetworkServiceService],
})
export class NetworkServiceModule {}
