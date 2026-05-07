export class CreateReportDto {
  targetId: string;
  targetType: 'post' | 'comment' | 'user';
  description: string;
}
