import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator'
import { Type } from 'class-transformer'

/** Parámetros opcionales del envío del digest (08 §1) */
export class SendNewsletterDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  days?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  limit?: number
}

/** Baja del digest: id del suscriptor + token HMAC del link */
export class UnsubscribeDto {
  @IsString()
  s!: string

  @IsString()
  t!: string
}
