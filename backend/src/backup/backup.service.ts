import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createReadStream, unlink } from 'fs';
import { promisify as promisifyFs } from 'util';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);
const unlinkAsync = promisifyFs(unlink);

@Injectable()
export class BackupService {
    private readonly logger = new Logger(BackupService.name);

    private readonly s3 = new S3Client({
        region: process.env.AWS_REGION || 'auto',
        endpoint: process.env.AWS_ENDPOINT,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
        forcePathStyle: true, // required for Cloudflare R2
    });

    // Run every 6 hours
    @Cron('0 */6 * * *')
    async runBackup() {
        this.logger.log('Starting Postgres backup to R2...');

        const dbUrl = process.env.DATABASE_URL;
        const bucket = process.env.AWS_BUCKET;

        if (!dbUrl) {
            this.logger.error('DATABASE_URL is not set — skipping backup');
            return;
        }
        if (!bucket) {
            this.logger.error('AWS_BUCKET is not set — skipping backup');
            return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `postgres_backup_${timestamp}.sql.gz`;
        const localPath = join(tmpdir(), filename);

        try {
            // Run pg_dump and pipe through gzip
            const cmd = `pg_dump '${dbUrl}' | gzip > ${localPath}`;
            this.logger.log('Running pg_dump...');
            const { stderr } = await execAsync(cmd, { shell: '/bin/sh' });
            if (stderr) this.logger.warn(`pg_dump stderr: ${stderr}`);
            this.logger.log(`Dump created at ${localPath}`);
        } catch (err) {
            this.logger.error(`pg_dump failed: ${err.message}`);
            return;
        }

        try {
            // Upload to Cloudflare R2
            const s3Key = `Setorial-Postgres/${filename}`;
            this.logger.log(`Uploading to R2: ${bucket}/${s3Key}`);

            const fileStream = createReadStream(localPath);
            await this.s3.send(new PutObjectCommand({
                Bucket: bucket,
                Key: s3Key,
                Body: fileStream,
                ContentType: 'application/gzip',
            }));

            this.logger.log(`Successfully uploaded backup to R2: ${s3Key}`);
        } catch (err) {
            this.logger.error(`Failed to upload backup to R2: ${err.message}`);
        } finally {
            // Always clean up the local temp file
            try {
                await unlinkAsync(localPath);
            } catch (_) {}
        }
    }
}
