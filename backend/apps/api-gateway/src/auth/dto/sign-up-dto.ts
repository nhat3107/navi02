export class SignUpDto {
    email: string;
    password: string;
}
// Có thể sẽ sử dụng các thư viện để Validate trước khi gửi đến controller (class-validator, class-transformer)
// Sẽ bổ sung các decorator sau