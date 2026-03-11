import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common'
import { CouncilMembersService } from './council-members.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateCouncilMemberDto } from './dto/create-council-member.dto'
import { UpdateCouncilMemberDto } from './dto/update-council-member.dto'

@Controller('council-members')
export class CouncilMembersController {
  constructor(private service: CouncilMembersService) {}

  /** Público: solo miembros visibles */
  @Get()
  findAll() {
    return this.service.findAll(true)
  }

  /** Admin: todos los miembros */
  @Get('admin/all')
  @UseGuards(JwtAuthGuard)
  findAllAdmin() {
    return this.service.findAll(false)
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateCouncilMemberDto) {
    return this.service.create(dto)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateCouncilMemberDto) {
    return this.service.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.service.remove(id)
  }
}
