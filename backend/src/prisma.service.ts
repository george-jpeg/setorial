import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    constructor() {
        // Strip sslmode from the URL — newer pg versions treat 'require' as 'verify-full'
        // which rejects Aiven's self-signed chain. We set ssl options explicitly instead.
        const rawUrl = process.env.DATABASE_URL || '';
        const connectionString = rawUrl.replace(/([?&])sslmode=[^&]*/g, '$1').replace(/[?&]$/, '');
        const pool = new Pool({
            connectionString,
            ssl: rawUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
        });
        const adapter = new PrismaPg(pool);
        super({ adapter } as any);
    }

    async onModuleInit() {
        await this.$connect();
    }
}
