import { Controller, Get, Post, Delete, Param, Body, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Throttle } from '@nestjs/throttler'
import { MediaService } from './media.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('media')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  /** Galería admin — requiere autenticación */
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File, @Body('altText') altText?: string) {
    return this.mediaService.upload(file, altText)
  }

  /** Imágenes de noticias (admin) — requiere autenticación */
  @Post('upload/noticias')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  uploadNoticias(@UploadedFile() file: Express.Multer.File) {
    return this.mediaService.uploadNoticias(file)
  }

  /** Imágenes de artículos médicos (doctores) — público con throttling */
  @Post('upload/articulos')
  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  @UseInterceptors(FileInterceptor('file'))
  uploadArticulos(@UploadedFile() file: Express.Multer.File) {
    return this.mediaService.uploadArticulos(file)
  }

  /** Fotos del Consejo Médico Editorial (admin) */
  @Post('upload/consejo')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
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
