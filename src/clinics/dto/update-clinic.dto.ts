import { IsString, IsOptional, IsNumber, IsUUID, Min, Max, MinLength, MaxLength } from 'class-validator'

export class UpdateClinicDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  address?: string

  @IsOptional()
  @IsUUID()
  cityId?: string

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string
}
