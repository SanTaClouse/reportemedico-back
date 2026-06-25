import { IsArray, IsUUID } from 'class-validator'

export class ReorderBioLinksDto {
  @IsArray()
  @IsUUID('4', { each: true })
  orderedLinkIds!: string[]
}
