import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Post, PostSchema } from '../posts/schemas/post.schema';
import { Report, ReportSchema } from '../reports/schemas/report.schema';
import { KafkaClientModule } from '../kafka-client.module';
import { AdminPostsService } from './admin-posts.service';
import { AdminProfilesService } from './admin-profiles.service';
import { AdminReportsService } from './admin-reports.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    KafkaClientModule,
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Report.name, schema: ReportSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [
    AdminProfilesService,
    AdminPostsService,
    AdminReportsService,
  ],
  exports: [AdminPostsService],
})
export class AdminModule {}
