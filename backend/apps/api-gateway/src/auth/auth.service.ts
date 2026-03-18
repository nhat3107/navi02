import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class AuthService {
  constructor(@Inject('KAFKA_SERVICE') private readonly kafkaclient: ClientKafka) {}

  onModuleInit() {
    this.kafkaclient.subscribeToResponseOf('auth.get_auths_service');
  }

  create(createAuthDto: CreateAuthDto) {
    return 'This action adds a new auth';
  }

  findAll() {
    return this.kafkaclient.send('auth.get_auths_service', {});
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }
}
