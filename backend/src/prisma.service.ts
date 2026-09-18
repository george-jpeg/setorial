import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    constructor() {
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.DATABASE_URL?.includes('sslmode=require')
                ? { rejectUnauthorized: false }
                : false,
        });
        const adapter = new PrismaPg(pool);
        super({ adapter } as any);
    }

    async onModuleInit() {
        await this.$connect();
    }
}
