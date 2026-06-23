import { IsOptional, IsInt, Min, Max, IsString, IsArray, IsUUID, IsIn } from 'class-validator'
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

/**
 * Envío de una noticia por correo (08 §1). Si vienen subscriberIds → selección
 * manual; si no, audience 'interested' = suscriptores con un tema en común.
 */
export class SendArticleEmailDto {
  @IsOptional()
  @IsIn(['interested'])
  audience?: 'interested'

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  subscriberIds?: string[]
}
