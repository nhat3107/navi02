import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CallService } from './call.service';

@Controller('call')
export class CallController {
  constructor(private readonly callService: CallService) {}

  @HttpCode(HttpStatus.OK)
  @Post('token')
  getToken() {
    return this.callService.generateToken();
  }

  /** Create a server-side room and return `{ token, meetingId }` for the caller. */
  @HttpCode(HttpStatus.OK)
  @Post('room')
  createRoom() {
    return this.callService.createRoomAndToken();
  }
}
