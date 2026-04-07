import { IsArray, ValidateNested, IsString, IsInt, Min } from 'class-validator'
import { Type } from 'class-transformer'

class GalleryItemOrderDto {
  @IsString()
  mediaId!: string

  @IsInt()
  @Min(0)
  position!: number
}

export class ReorderGalleryDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GalleryItemOrderDto)
  items!: GalleryItemOrderDto[]
}
