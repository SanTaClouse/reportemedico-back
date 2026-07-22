import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../email/email.service'
import { stripAllHtml } from '../utils/sanitize.util'
import { CreateLeadDto } from './dto/create-lead.dto'

const PLAN_LABELS: Record<string, string> = {
  BASIC: 'Básica', STANDARD: 'Estándar', PREMIUM: 'Premium',
}

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name)

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  /**
   * Alta pública de lead. Endpoint SIN auth: entra texto de cualquiera, así que
   * todo se limpia de HTML antes de guardar (el admin lo lee en su panel).
   */
  async create(dto: CreateLeadDto) {
    const lead = await this.prisma.lead.create({
      data: {
        firstName: stripAllHtml(dto.firstName).trim(),
        lastName: stripAllHtml(dto.lastName).trim(),
        email: dto.email.trim().toLowerCase(),
        phone: stripAllHtml(dto.phone).trim(),
        specialtyId: dto.specialtyId ?? null,
        interestPlan: dto.interestPlan ?? 'BASIC',
      },
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true,
        interestPlan: true,
        specialty: { select: { name: true } },
      },
    })
    this.logger.log(`Lead nuevo: ${lead.email} (plan ${lead.interestPlan})`)

    // Aviso a ventas — fire-and-forget: un fallo de email NUNCA rompe el alta
    this.email
      .sendNewLeadToAdmin({
        firstName: lead.firstName,
        lastName: lead.lastName,
        phone: lead.phone,
        email: lead.email,
        specialtyName: lead.specialty?.name ?? null,
        planLabel: PLAN_LABELS[lead.interestPlan] ?? lead.interestPlan,
      })
      .catch((e) => this.logger.error(`No se pudo avisar el lead nuevo: ${e.message}`))

    const { specialty, ...rest } = lead
    return { ...rest, specialtyId: dto.specialtyId ?? null }
  }

  /** Datos del lead para precargar el wizard tras crear la cuenta */
  findOne(id: string) {
    return this.prisma.lead.findUnique({
      where: { id },
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true,
        specialtyId: true, interestPlan: true, convertedAt: true,
      },
    })
  }

  /**
   * Marca el lead como convertido y lo ata al médico creado.
   * Idempotente: si ya estaba convertido no lo pisa (el wizard puede guardarse
   * varias veces y no queremos mover la fecha de conversión).
   */
  async markConverted(id: string, doctorId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id }, select: { convertedAt: true } })
    if (!lead || lead.convertedAt) return null
    return this.prisma.lead.update({
      where: { id },
      data: { doctorId, convertedAt: new Date() },
    })
  }

  /**
   * Listado para el panel de ventas. `converted` filtra:
   *   false → los que dejaron datos y NUNCA completaron el registro (los más
   *           valiosos para llamar: están perdidos sin esta lista)
   *   true  → los que sí crearon cuenta
   */
  async findAll(params: { converted?: boolean; page?: number; limit?: number }) {
    const { converted, page = 1, limit = 50 } = params
    const where =
      converted === undefined ? {} : converted ? { NOT: { convertedAt: null } } : { convertedAt: null }

    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          specialty: { select: { id: true, name: true, slug: true } },
          doctor: { select: { id: true, slug: true, plan: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.lead.count({ where }),
    ])
    return { items, total, page, limit }
  }
}
