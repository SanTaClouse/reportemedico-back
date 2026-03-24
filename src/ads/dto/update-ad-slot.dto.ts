import { IsString, IsBoolean, IsOptional, IsIn } from 'class-validator'

export class UpdateAdSlotDto {
  @IsString()
  @IsOptional()
  description?: string

  @IsBoolean()
  @IsOptional()
  isActive?: boolean

  @IsIn(['SINGLE', 'STRIP'])
  @IsOptional()
  displayMode?: 'SINGLE' | 'STRIP'
}
