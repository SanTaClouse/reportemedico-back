import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateAdDto } from './dto/create-ad.dto'
import { UpdateAdDto } from './dto/update-ad.dto'

const AD_PREVIEW_SELECT = { id: true, title: true, imageUrl: true, isActive: true }

@Injectable()
export class AdsService {
  constructor(private prisma: PrismaService) {}

  // ─── AD SLOTS ──────────────────────────────────────────

  /** Lista todos los slots con sus anuncios asignados (ordenados por `order`) */
  findAllSlots() {
    return this.prisma.adSlot.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { assignments: true } },
        assignments: {
          orderBy: { order: 'asc' },
          include: { ad: { select: AD_PREVIEW_SELECT } },
        },
      },
    })
  }

  // ─── ADS ───────────────────────────────────────────────

  /** Lista todos los anuncios con los slots donde están asignados */
  findAll() {
    return this.prisma.ad.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        assignments: {
          include: { slot: { select: { id: true, name: true, description: true } } },
        },
      },
    })
  }

  create(dto: CreateAdDto) {
    return this.prisma.ad.create({ data: dto })
  }

  async update(id: string, dto: UpdateAdDto) {
    await this.findAdOrThrow(id)
    return this.prisma.ad.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    await this.findAdOrThrow(id)
    return this.prisma.ad.delete({ where: { id } })
  }

  async incrementClicks(id: string) {
    await this.findAdOrThrow(id)
    return this.prisma.ad.update({
      where: { id },
      data: { clicks: { increment: 1 } },
      select: { id: true, clicks: true },
    })
  }

  async incrementImpressions(id: string) {
    return this.prisma.ad.update({
      where: { id },
      data: { impressions: { increment: 1 } },
      select: { id: true, impressions: true },
    }).catch(() => null) // fire-and-forget: ignorar si el anuncio ya no existe
  }

  // ─── ASSIGNMENTS ────────────────────────────────────────

  /** Asigna un anuncio a un slot. Lanza ConflictException si ya está asignado. */
  async assignAdToSlot(adId: string, slotId: string) {
    await this.findAdOrThrow(adId)
    await this.findSlotOrThrow(slotId)

    const maxOrder = await this.prisma.adSlotAssignment.aggregate({
      where: { slotId },
      _max: { order: true },
    })
    const nextOrder = (maxOrder._max.order ?? -1) + 1

    try {
      return await this.prisma.adSlotAssignment.create({
        data: { adId, slotId, order: nextOrder },
        include: { ad: { select: AD_PREVIEW_SELECT } },
      })
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('Este anuncio ya está asignado a este banner')
      throw e
    }
  }

  /** Quita un anuncio de un slot y normaliza los `order` restantes */
  async removeAdFromSlot(adId: string, slotId: string) {
    const assignment = await this.prisma.adSlotAssignment.findUnique({
      where: { adId_slotId: { adId, slotId } },
    })
    if (!assignment) throw new NotFoundException('Asignación no encontrada')

    await this.prisma.adSlotAssignment.delete({
      where: { adId_slotId: { adId, slotId } },
    })

    // Re-normalizar los order restantes en el slot
    const remaining = await this.prisma.adSlotAssignment.findMany({
      where: { slotId },
      orderBy: { order: 'asc' },
    })
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].order !== i) {
        await this.prisma.adSlotAssignment.update({
          where: { id: remaining[i].id },
          data: { order: i },
        })
      }
    }
    return { success: true }
  }

  /** Reordena los anuncios de un slot según la lista de IDs recibida */
  async reorderSlotAds(slotId: string, orderedAdIds: string[]) {
    await this.findSlotOrThrow(slotId)
    await Promise.all(
      orderedAdIds.map((adId, index) =>
        this.prisma.adSlotAssignment.update({
          where: { adId_slotId: { adId, slotId } },
          data: { order: index },
        }),
      ),
    )
    return { success: true }
  }

  // ─── PÚBLICO ────────────────────────────────────────────

  /**
   * Devuelve el slot activo con sus anuncios.
   * SINGLE: un anuncio aleatorio. STRIP: todos en orden.
   */
  async findActiveBySlot(slotName: string) {
    const slot = await this.prisma.adSlot.findUnique({
      where: { name: slotName },
      select: { displayMode: true, isActive: true },
    })

    if (!slot?.isActive) return { displayMode: 'SINGLE', ads: [] }

    const assignments = await this.prisma.adSlotAssignment.findMany({
      where: { ad: { isActive: true }, slot: { name: slotName } },
      orderBy: { order: 'asc' },
      select: { ad: { select: { id: true, title: true, imageUrl: true, link: true } } },
    })
    const ads = assignments.map((a) => a.ad)

    if (slot.displayMode === 'STRIP') return { displayMode: 'STRIP', ads }

    if (ads.length === 0) return { displayMode: 'SINGLE', ads: [] }
    const pick = ads[Math.floor(Math.random() * ads.length)]
    return { displayMode: 'SINGLE', ads: [pick] }
  }

  async updateSlot(id: string, dto: import('./dto/update-ad-slot.dto').UpdateAdSlotDto) {
    await this.findSlotOrThrow(id)
    return this.prisma.adSlot.update({ where: { id }, data: dto })
  }

  // ─── PRIVADOS ───────────────────────────────────────────

  private async findSlotOrThrow(id: string) {
    const slot = await this.prisma.adSlot.findUnique({ where: { id } })
    if (!slot) throw new NotFoundException('Slot publicitario no encontrado')
    return slot
  }

  private async findAdOrThrow(id: string) {
    const ad = await this.prisma.ad.findUnique({ where: { id } })
    if (!ad) throw new NotFoundException('Anuncio no encontrado')
    return ad
  }
}
