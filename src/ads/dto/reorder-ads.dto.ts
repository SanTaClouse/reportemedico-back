import { IsArray, IsUUID } from 'class-validator'

export class ReorderAdsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  orderedAdIds!: string[]
}
