import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthServiceService {
  getHello(): string {
    console.log('AuthServiceService.getHello called');
    return 'Hello from Huunghi dep dzai nhat vu tru';
  }
}
