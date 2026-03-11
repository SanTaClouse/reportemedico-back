import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common'
import { PrintEditionsService } from './print-editions.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreatePrintEditionDto } from './dto/create-print-edition.dto'
import { UpdatePrintEditionDto } from './dto/update-print-edition.dto'

@Controller('print-editions')
export class PrintEditionsController {
  constructor(private service: PrintEditionsService) {}

  @Get()
  findAll() {
    return this.service.findAll(true)
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard)
  findAllAdmin() {
    return this.service.findAll(false)
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreatePrintEditionDto) {
    return this.service.create(dto)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdatePrintEditionDto) {
    return this.service.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.service.remove(id)
  }
}
