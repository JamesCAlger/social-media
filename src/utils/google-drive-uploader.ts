import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { logger } from '../core/logger';

export class GoogleDriveUploader {
  private drive: any;
  private folderId: string | null = null;

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth() {
    try {
      // Service Account authentication (recommended for automation)
      const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;

      if (keyPath && fs.existsSync(keyPath)) {
        // Use Service Account
        const auth = new google.auth.GoogleAuth({
          keyFile: keyPath,
          scopes: ['https://www.googleapis.com/auth/drive.file'],
        });

        this.drive = google.drive({ version: 'v3', auth });
        logger.info('Google Drive initialized with Service Account');
      } else {
        // Fallback to OAuth credentials
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          'urn:ietf:wg:oauth:2.0:oob' // For CLI/desktop apps
        );

        if (process.env.GOOGLE_REFRESH_TOKEN) {
          oauth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
          });
          this.drive = google.drive({ version: 'v3', auth: oauth2Client });
          logger.info('Google Drive initialized with OAuth');
        } else {
          throw new Error(
            'Google Drive credentials not configured. Set either GOOGLE_SERVICE_ACCOUNT_KEY_PATH or GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REFRESH_TOKEN'
          );
        }
      }
    } catch (error) {
      logger.error('Failed to initialize Google Drive', { error });
      throw error;
    }
  }

  /**
   * Get or create the folder for storing videos
   */
  private async getOrCreateFolder(folderName: string = 'Social Media Videos'): Promise<string> {
    if (this.folderId) {
      return this.folderId;
    }

    // Use folder ID from environment if provided (for shared folders)
    if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
      this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      logger.info('Using Google Drive folder from env', { folderId: this.folderId });
      return this.folderId;
    }

    try {
      // Search for existing folder
      const response = await this.drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive',
      });

      if (response.data.files && response.data.files.length > 0) {
        const folderId = response.data.files[0].id;
        if (!folderId) {
          throw new Error('Folder ID not returned from Google Drive API');
        }
        this.folderId = folderId;
        logger.info('Using existing Google Drive folder', { folderId: this.folderId });
        return this.folderId!;
      }

      // Create new folder
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      };

      const folder = await this.drive.files.create({
        requestBody: folderMetadata,
        fields: 'id',
      });

      const folderId = folder.data.id;
      if (!folderId) {
        throw new Error('Folder ID not returned when creating Google Drive folder');
      }
      this.folderId = folderId;
      logger.info('Created new Google Drive folder', { folderId: this.folderId });
      return this.folderId!;
    } catch (error) {
      logger.error('Failed to get or create folder', { error });
      throw error;
    }
  }

  /**
   * Upload a video file to Google Drive and return a public direct download URL
   */
  async uploadVideo(videoPath: string): Promise<string> {
    try {
      const fileName = path.basename(videoPath);
      const folderId = await this.getOrCreateFolder();

      logger.info('Uploading video to Google Drive', { fileName });

      // Upload file
      const fileMetadata = {
        name: fileName,
        parents: [folderId],
        mimeType: 'video/mp4',
      };

      const media = {
        mimeType: 'video/mp4',
        body: fs.createReadStream(videoPath),
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink',
      });

      const fileId = response.data.id;
      logger.info('Video uploaded to Google Drive', { fileId, fileName });

      // Make file publicly accessible
      await this.drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      logger.info('Video made publicly accessible', { fileId });

      // Generate direct download URL
      const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

      return directUrl;
    } catch (error) {
      logger.error('Failed to upload video to Google Drive', { error, videoPath });
      throw error;
    }
  }

  /**
   * Delete a file from Google Drive
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.drive.files.delete({ fileId });
      logger.info('Deleted file from Google Drive', { fileId });
    } catch (error) {
      logger.error('Failed to delete file from Google Drive', { error, fileId });
      throw error;
    }
  }

  /**
   * Clean up old videos (optional - saves storage space)
   * Deletes videos older than specified days
   */
  async cleanupOldVideos(daysOld: number = 7): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoffDateISO = cutoffDate.toISOString();

      logger.info('Cleaning up old videos', { daysOld, cutoffDate: cutoffDateISO });

      const response = await this.drive.files.list({
        q: `mimeType='video/mp4' and createdTime < '${cutoffDateISO}' and trashed=false`,
        fields: 'files(id, name, createdTime)',
        orderBy: 'createdTime',
      });

      const files = response.data.files || [];
      logger.info(`Found ${files.length} old videos to delete`);

      for (const file of files) {
        await this.deleteFile(file.id);
        logger.info('Deleted old video', { id: file.id, name: file.name, created: file.createdTime });
      }

      logger.info('Cleanup completed', { deletedCount: files.length });
    } catch (error) {
      logger.error('Failed to cleanup old videos', { error });
      throw error;
    }
  }

  /**
   * List all videos in the folder
   */
  async listVideos(): Promise<Array<{ id: string; name: string; createdTime: string; size: string }>> {
    try {
      const folderId = await this.getOrCreateFolder();

      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and mimeType='video/mp4' and trashed=false`,
        fields: 'files(id, name, createdTime, size)',
        orderBy: 'createdTime desc',
      });

      return response.data.files || [];
    } catch (error) {
      logger.error('Failed to list videos', { error });
      throw error;
    }
  }
}
