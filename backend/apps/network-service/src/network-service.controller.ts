import { Controller, Get } from '@nestjs/common';
import { NetworkServiceService } from './network-service.service';

@Controller()
export class NetworkServiceController {
  constructor(private readonly networkServiceService: NetworkServiceService) {}

  @Get()
  getHello(): string {
    return this.networkServiceService.getHello();
  }
}
