import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { RevalidationService } from '../revalidation/revalidation.service'
import { CreateBioLinkDto } from './dto/create-bio-link.dto'
import { UpdateBioLinkDto } from './dto/update-bio-link.dto'
import { UpdateBioPageDto } from './dto/update-bio-page.dto'

type DeviceType = 'mobile' | 'desktop'
type DailyRow = { day: Date; count: number }

const DEFAULT_SLUG = 'bio'

@Injectable()
export class BioService {
  constructor(
    private prisma: PrismaService,
    private revalidation: RevalidationService,
  ) {}

  // ─── PÚBLICO ────────────────────────────────────────────

  /**
   * Página pública + enlaces visibles (activos y dentro de su ventana de fechas).
   * Los enlaces NO exponen su `url`: el clic se fuerza por /r/:id (tracking + redirect).
   */
  async getPublicPage(slug = DEFAULT_SLUG) {
    const now = new Date()
    const page = await this.prisma.bioPage.findUnique({
      where: { slug },
      include: {
        links: {
          where: {
            isActive: true,
            AND: [
              { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
              { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
            ],
          },
          orderBy: { order: 'asc' },
          select: { id: true, label: true, icon: true },
        },
      },
    })
    if (!page || !page.isActive) return null
    return {
      slug: page.slug,
      title: page.title,
      subtitle: page.subtitle,
      avatarUrl: page.avatarUrl,
      links: page.links,
    }
  }

  /** Registra una vista. Silencioso ante errores: nunca rompe la navegación del visitante. */
  async registerView(slug = DEFAULT_SLUG, referrer?: string, device?: DeviceType): Promise<void> {
    const page = await this.prisma.bioPage.findUnique({ where: { slug }, select: { id: true } })
    if (!page) return
    await this.prisma.bioPageView
      .create({ data: { pageId: page.id, referrer: referrer ?? null, device: device ?? null } })
      .catch(() => undefined)
  }

  /** Registra el clic y devuelve la URL destino para que el redirect haga el 302. */
  async registerClickAndGetUrl(linkId: string, referrer?: string, device?: DeviceType): Promise<{ url: string }> {
    const link = await this.prisma.bioLink.findUnique({ where: { id: linkId }, select: { url: true } })
    if (!link) throw new NotFoundException('Enlace no encontrado')
    await this.prisma.bioLinkClick
      .create({ data: { linkId, referrer: referrer ?? null, device: device ?? null } })
      .catch(() => undefined)
    return { url: link.url }
  }

  // ─── ADMIN: PÁGINA Y ENLACES ────────────────────────────

  async getAdminPage(slug = DEFAULT_SLUG) {
    const page = await this.prisma.bioPage.findUnique({
      where: { slug },
      include: { links: { orderBy: { order: 'asc' } } },
    })
    if (!page) throw new NotFoundException('Página bio no encontrada')
    return page
  }

  async updatePage(slug: string, dto: UpdateBioPageDto) {
    const data: Record<string, unknown> = {}
    if (dto.title !== undefined) data.title = dto.title
    if (dto.subtitle !== undefined) data.subtitle = dto.subtitle?.trim() || null
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl?.trim() || null
    if (dto.isActive !== undefined) data.isActive = dto.isActive

    const page = await this.prisma.bioPage.update({ where: { slug }, data }).catch(() => {
      throw new NotFoundException('Página bio no encontrada')
    })
    await this.revalidate()
    return page
  }

  async createLink(slug: string, dto: CreateBioLinkDto) {
    const page = await this.prisma.bioPage.findUnique({ where: { slug }, select: { id: true } })
    if (!page) throw new NotFoundException('Página bio no encontrada')

    const max = await this.prisma.bioLink.aggregate({
      where: { pageId: page.id },
      _max: { order: true },
    })

    const link = await this.prisma.bioLink.create({
      data: {
        pageId: page.id,
        label: dto.label,
        url: dto.url,
        icon: dto.icon?.trim() || null,
        isActive: dto.isActive ?? true,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        order: (max._max.order ?? -1) + 1,
      },
    })
    await this.revalidate()
    return link
  }

  async updateLink(id: string, dto: UpdateBioLinkDto) {
    await this.findLinkOrThrow(id)
    const data: Record<string, unknown> = {}
    if (dto.label !== undefined) data.label = dto.label
    if (dto.url !== undefined) data.url = dto.url
    if (dto.icon !== undefined) data.icon = dto.icon?.trim() || null
    if (dto.isActive !== undefined) data.isActive = dto.isActive
    if (dto.startsAt !== undefined) data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null
    if (dto.endsAt !== undefined) data.endsAt = dto.endsAt ? new Date(dto.endsAt) : null

    const link = await this.prisma.bioLink.update({ where: { id }, data })
    await this.revalidate()
    return link
  }

  async removeLink(id: string) {
    const link = await this.findLinkOrThrow(id)
    await this.prisma.bioLink.delete({ where: { id } })

    // Re-normalizar el `order` de los enlaces restantes de la página
    const remaining = await this.prisma.bioLink.findMany({
      where: { pageId: link.pageId },
      orderBy: { order: 'asc' },
    })
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].order !== i) {
        await this.prisma.bioLink.update({ where: { id: remaining[i].id }, data: { order: i } })
      }
    }
    await this.revalidate()
    return { success: true }
  }

  async reorderLinks(slug: string, orderedLinkIds: string[]) {
    const page = await this.prisma.bioPage.findUnique({ where: { slug }, select: { id: true } })
    if (!page) throw new NotFoundException('Página bio no encontrada')
    await Promise.all(
      orderedLinkIds.map((id, index) =>
        this.prisma.bioLink.update({ where: { id }, data: { order: index } }),
      ),
    )
    await this.revalidate()
    return { success: true }
  }

  // ─── ADMIN: ESTADÍSTICAS ────────────────────────────────

  /** Vistas, clics, CTR, ranking por enlace y serie diaria para el panel. */
  async getStats(slug = DEFAULT_SLUG, rangeDays = 30) {
    const page = await this.prisma.bioPage.findUnique({ where: { slug }, select: { id: true } })
    if (!page) throw new NotFoundException('Página bio no encontrada')
    const pageId = page.id
    const since = new Date(Date.now() - rangeDays * 86_400_000)

    const [viewsRange, clicksRange, viewsAllTime, clicksAllTime, links, perLink] = await Promise.all([
      this.prisma.bioPageView.count({ where: { pageId, createdAt: { gte: since } } }),
      this.prisma.bioLinkClick.count({ where: { link: { pageId }, createdAt: { gte: since } } }),
      this.prisma.bioPageView.count({ where: { pageId } }),
      this.prisma.bioLinkClick.count({ where: { link: { pageId } } }),
      this.prisma.bioLink.findMany({
        where: { pageId },
        orderBy: { order: 'asc' },
        select: { id: true, label: true, icon: true, isActive: true },
      }),
      this.prisma.bioLinkClick.groupBy({
        by: ['linkId'],
        where: { link: { pageId }, createdAt: { gte: since } },
        _count: { _all: true },
      }),
    ])

    const clicksByLink = new Map(perLink.map((p) => [p.linkId, p._count._all]))
    const linkStats = links
      .map((l) => ({ id: l.id, label: l.label, icon: l.icon, isActive: l.isActive, clicks: clicksByLink.get(l.id) ?? 0 }))
      .sort((a, b) => b.clicks - a.clicks)

    const [viewsDaily, clicksDaily] = await Promise.all([
      this.prisma.$queryRaw<DailyRow[]>`
        SELECT date_trunc('day', "createdAt") AS day, count(*)::int AS count
        FROM "BioPageView"
        WHERE "pageId" = ${pageId} AND "createdAt" >= ${since}
        GROUP BY day ORDER BY day ASC`,
      this.prisma.$queryRaw<DailyRow[]>`
        SELECT date_trunc('day', c."createdAt") AS day, count(*)::int AS count
        FROM "BioLinkClick" c
        JOIN "BioLink" l ON l.id = c."linkId"
        WHERE l."pageId" = ${pageId} AND c."createdAt" >= ${since}
        GROUP BY day ORDER BY day ASC`,
    ])

    return {
      range: rangeDays,
      views: viewsRange,
      clicks: clicksRange,
      ctr: viewsRange > 0 ? Math.round((clicksRange / viewsRange) * 1000) / 10 : 0, // %
      viewsAllTime,
      clicksAllTime,
      links: linkStats,
      series: buildDailySeries(since, rangeDays, viewsDaily, clicksDaily),
    }
  }

  // ─── PRIVADOS ───────────────────────────────────────────

  private async findLinkOrThrow(id: string) {
    const link = await this.prisma.bioLink.findUnique({ where: { id } })
    if (!link) throw new NotFoundException('Enlace no encontrado')
    return link
  }

  /** Fire-and-forget vía RevalidationService: regenera la página ISR /bio. */
  private async revalidate(): Promise<void> {
    await this.revalidation.revalidatePaths(['/bio'])
  }
}

// ─── Helpers de serie temporal (buckets UTC por día) ──────

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function buildDailySeries(since: Date, rangeDays: number, views: DailyRow[], clicks: DailyRow[]) {
  const vMap = new Map(views.map((r) => [dayKey(new Date(r.day)), Number(r.count)]))
  const cMap = new Map(clicks.map((r) => [dayKey(new Date(r.day)), Number(r.count)]))
  const start = Date.UTC(since.getUTCFullYear(), since.getUTCMonth(), since.getUTCDate())
  const out: { date: string; views: number; clicks: number }[] = []
  for (let i = 0; i <= rangeDays; i++) {
    const k = dayKey(new Date(start + i * 86_400_000))
    out.push({ date: k, views: vMap.get(k) ?? 0, clicks: cMap.get(k) ?? 0 })
  }
  return out
}
