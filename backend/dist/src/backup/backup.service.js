"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BackupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const client_s3_1 = require("@aws-sdk/client-s3");
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_1 = require("fs");
const util_2 = require("util");
const path_1 = require("path");
const os_1 = require("os");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const unlinkAsync = (0, util_2.promisify)(fs_1.unlink);
let BackupService = BackupService_1 = class BackupService {
    logger = new common_1.Logger(BackupService_1.name);
    s3 = new client_s3_1.S3Client({
        region: process.env.AWS_REGION || 'auto',
        endpoint: process.env.AWS_ENDPOINT,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
        forcePathStyle: true,
    });
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
        const localPath = (0, path_1.join)((0, os_1.tmpdir)(), filename);
        try {
            const cmd = `pg_dump '${dbUrl}' | gzip > ${localPath}`;
            this.logger.log('Running pg_dump...');
            const { stderr } = await execAsync(cmd, { shell: '/bin/sh' });
            if (stderr)
                this.logger.warn(`pg_dump stderr: ${stderr}`);
            this.logger.log(`Dump created at ${localPath}`);
        }
        catch (err) {
            this.logger.error(`pg_dump failed: ${err.message}`);
            return;
        }
        try {
            const s3Key = `Setorial-Postgres/${filename}`;
            this.logger.log(`Uploading to R2: ${bucket}/${s3Key}`);
            const fileStream = (0, fs_1.createReadStream)(localPath);
            await this.s3.send(new client_s3_1.PutObjectCommand({
                Bucket: bucket,
                Key: s3Key,
                Body: fileStream,
                ContentType: 'application/gzip',
            }));
            this.logger.log(`Successfully uploaded backup to R2: ${s3Key}`);
        }
        catch (err) {
            this.logger.error(`Failed to upload backup to R2: ${err.message}`);
        }
        finally {
            try {
                await unlinkAsync(localPath);
            }
            catch (_) { }
        }
    }
};
exports.BackupService = BackupService;
__decorate([
    (0, schedule_1.Cron)('0 */6 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BackupService.prototype, "runBackup", null);
exports.BackupService = BackupService = BackupService_1 = __decorate([
    (0, common_1.Injectable)()
], BackupService);
//# sourceMappingURL=backup.service.js.map