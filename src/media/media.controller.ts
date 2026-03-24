import { Controller, Get, Post, Delete, Param, Body, UseGuards, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Throttle } from '@nestjs/throttler'
import { MediaService } from './media.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_FILE_SIZE_MB = 15

const FILE_UPLOAD_OPTIONS = {
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 }, // 15 MB
  fileFilter: (_req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new BadRequestException(`Tipo de archivo no permitido. Solo se aceptan: ${ALLOWED_MIME_TYPES.join(', ')}`), false)
    }
    cb(null, true)
  },
}

@Controller('media')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  /** Galería admin — requiere autenticación */
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', FILE_UPLOAD_OPTIONS))
  upload(@UploadedFile() file: Express.Multer.File, @Body('altText') altText?: string) {
    return this.mediaService.upload(file, altText)
  }

  /** Imágenes de noticias (admin) — requiere autenticación */
  @Post('upload/noticias')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', FILE_UPLOAD_OPTIONS))
  uploadNoticias(@UploadedFile() file: Express.Multer.File) {
    return this.mediaService.uploadNoticias(file)
  }

  /** Imágenes de artículos médicos (doctores) — público con throttling */
  @Post('upload/articulos')
  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  @UseInterceptors(FileInterceptor('file', FILE_UPLOAD_OPTIONS))
  uploadArticulos(@UploadedFile() file: Express.Multer.File) {
    return this.mediaService.uploadArticulos(file)
  }

  /** Fotos del Consejo Médico Editorial (admin) */
  @Post('upload/consejo')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', FILE_UPLOAD_OPTIONS))
  uploadConsejo(@UploadedFile() file: Express.Multer.File) {
    return this.mediaService.uploadConsejo(file)
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.mediaService.findAll()
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.mediaService.remove(id)
  }
}
