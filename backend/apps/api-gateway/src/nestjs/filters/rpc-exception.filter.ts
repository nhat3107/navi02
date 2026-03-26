import { Catch, ArgumentsHost, ExceptionFilter, HttpStatus } from '@nestjs/common';

// File này đc tạo ra để chuyển đổi lỗi RPC thành lỗi HTTP
// Vì trong microservice, lỗi đc trả về dưới dạng RPCException
// Tham khảo tại: https://docs.nestjs.com/exception-filters#exception-filters-1 và https://docs.nestjs.com/microservices/exception-filters
@Catch()
export class RpcToHttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const rpcError = exception?.error || exception;
    const status = rpcError?.status || exception?.status || HttpStatus.INTERNAL_SERVER_ERROR;
    const message = rpcError?.message || exception?.message || 'Internal server error';

    response.status(status).json({
      statusCode: status,
      message,
    });
  }
}
