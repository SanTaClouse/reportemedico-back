import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { ArticlesService } from '../articles/articles.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private articlesService: ArticlesService) {}

  @Get('articles/:id')
  getArticleById(@Param('id') id: string) {
    return this.articlesService.findByIdAdmin(id)
  }

  @Get('articles')
  getArticles(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('type') type: string,
    @Query('status') status: string,
    @Query('relevance') relevance: string,
    @Query('tag') tag: string,
    @Query('search') search: string,
    @Query('sort') sort: string,
  ) {
    return this.articlesService.findAllAdmin({
      page: +page || 1,
      limit: +limit || 20,
      type,
      status,
      relevance: relevance ? +relevance : undefined,
      tag,
      search,
      sort,
    })
  }
}
