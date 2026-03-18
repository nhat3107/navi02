import { Injectable } from '@nestjs/common';

@Injectable()
export class NetworkServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
