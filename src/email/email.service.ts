import { Injectable, Logger } from '@nestjs/common'

/**
 * EmailService — pendiente de implementación con dominio verificado.
 * Los métodos existen para no romper imports futuros pero no envían nada.
 * TODO: integrar Brevo (SMTP) o Mailtrap cuando reportemedico.com esté verificado.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)

  async sendArticleReceived(_to: string, _authorName: string, _articleTitle: string): Promise<void> {
    this.logger.debug('[Email] sendArticleReceived — deshabilitado hasta configurar dominio')
  }

  async sendArticleApproved(_to: string, _authorName: string, _articleTitle: string, _slug: string): Promise<void> {
    this.logger.debug('[Email] sendArticleApproved — deshabilitado hasta configurar dominio')
  }

  async sendArticleRejected(_to: string, _authorName: string, _articleTitle: string): Promise<void> {
    this.logger.debug('[Email] sendArticleRejected — deshabilitado hasta configurar dominio')
  }
}
