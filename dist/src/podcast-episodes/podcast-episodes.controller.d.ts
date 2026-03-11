import { PodcastEpisodesService } from './podcast-episodes.service';
import { CreatePodcastEpisodeDto } from './dto/create-podcast-episode.dto';
import { UpdatePodcastEpisodeDto } from './dto/update-podcast-episode.dto';
export declare class PodcastEpisodesController {
    private service;
    constructor(service: PodcastEpisodesService);
    findAll(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        description: string | null;
        createdAt: Date;
        title: string;
        order: number;
        publishedAt: Date;
        isVisible: boolean;
        youtubeId: string;
        thumbnailUrl: string | null;
    }[]>;
    findAllAdmin(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        description: string | null;
        createdAt: Date;
        title: string;
        order: number;
        publishedAt: Date;
        isVisible: boolean;
        youtubeId: string;
        thumbnailUrl: string | null;
    }[]>;
    create(dto: CreatePodcastEpisodeDto): import(".prisma/client").Prisma.Prisma__PodcastEpisodeClient<{
        id: string;
        description: string | null;
        createdAt: Date;
        title: string;
        order: number;
        publishedAt: Date;
        isVisible: boolean;
        youtubeId: string;
        thumbnailUrl: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    update(id: string, dto: UpdatePodcastEpisodeDto): import(".prisma/client").Prisma.Prisma__PodcastEpisodeClient<{
        id: string;
        description: string | null;
        createdAt: Date;
        title: string;
        order: number;
        publishedAt: Date;
        isVisible: boolean;
        youtubeId: string;
        thumbnailUrl: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    remove(id: string): import(".prisma/client").Prisma.Prisma__PodcastEpisodeClient<{
        id: string;
        description: string | null;
        createdAt: Date;
        title: string;
        order: number;
        publishedAt: Date;
        isVisible: boolean;
        youtubeId: string;
        thumbnailUrl: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
}
