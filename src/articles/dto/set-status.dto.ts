import { IsEnum } from 'class-validator'
import { ArticleStatus } from '@prisma/client'

export class SetStatusDto {
  @IsEnum(ArticleStatus)
  status!: ArticleStatus
}
