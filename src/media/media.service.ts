import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { v2 as cloudinary } from 'cloudinary'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    cloudinary.config({
      cloud_name: config.get('CLOUDINARY_CLOUD_NAME'),
      api_key: config.get('CLOUDINARY_API_KEY'),
      api_secret: config.get('CLOUDINARY_API_SECRET'),
    })
  }

  private buildPublicId(originalName: string): string {
    const date = new Date()
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
    const baseName = originalName
      .replace(/\.[^/.]+$/, '')          // quitar extensión
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')   // quitar tildes
      .replace(/[^a-z0-9]+/g, '-')      // caracteres especiales → guión
      .replace(/^-|-$/g, '')            // quitar guiones al inicio/fin
      .slice(0, 60)                      // máximo 60 chars
    return `${dateStr}_${baseName}`
  }

  private uploadToCloudinary(file: Express.Multer.File, folder: string): Promise<any> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder, public_id: this.buildPublicId(file.originalname) },
          (error, result) => {
            if (error) reject(error)
            else resolve(result)
          },
        )
        .end(file.buffer)
    })
  }

  /** Upload para la galería Media (admin). Guarda en BD. */
  async upload(file: Express.Multer.File, altText?: string) {
    const result = await this.uploadToCloudinary(file, 'Reporte-Medico/Media')

    return this.prisma.media.create({
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        altText,
        width: result.width,
        height: result.height,
      },
    })
  }

  /** Upload para imágenes de noticias (admin). Solo devuelve URL. */
  async uploadNoticias(file: Express.Multer.File) {
    const result = await this.uploadToCloudinary(file, 'Reporte-Medico/Noticias')
    return { url: result.secure_url as string }
  }

  /** Upload público para artículos de doctores. Solo devuelve URL. */
  async uploadArticulos(file: Express.Multer.File) {
    const result = await this.uploadToCloudinary(file, 'Reporte-Medico/Articulos')
    return { url: result.secure_url as string }
  }

  /** Fotos del Consejo Médico Editorial (admin). Solo devuelve URL. */
  async uploadConsejo(file: Express.Multer.File) {
    const result = await this.uploadToCloudinary(file, 'Reporte-Medico/Consejo')
    return { url: result.secure_url as string }
  }

  findAll() {
    return this.prisma.media.findMany({ orderBy: { createdAt: 'desc' } })
  }

  async remove(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } })
    if (media) {
      await cloudinary.uploader.destroy(media.publicId)
      await this.prisma.media.delete({ where: { id } })
    }
    return { success: true }
  }
}
