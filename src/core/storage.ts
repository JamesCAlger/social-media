import fs from 'fs/promises';
import path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import axios from 'axios';

export interface IStorage {
  save(filePath: string, data: Buffer): Promise<string>;
  saveFromUrl(url: string, filePath: string): Promise<string>;
  get(filePath: string): Promise<Buffer>;
  exists(filePath: string): Promise<boolean>;
  delete(filePath: string): Promise<void>;
  getFullPath(filePath: string): string;
  saveJSON(filePath: string, data: any): Promise<string>;
  getJSON<T>(filePath: string): Promise<T>;
  listDirectories(relativePath: string): Promise<string[]>;
}

export class LocalStorage implements IStorage {
  private basePath: string;

  constructor(basePath: string = process.env.STORAGE_PATH || './content') {
    this.basePath = path.resolve(basePath);
  }

  getFullPath(filePath: string): string {
    return path.join(this.basePath, filePath);
  }

  async save(filePath: string, data: Buffer): Promise<string> {
    const fullPath = this.getFullPath(filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data);
    return fullPath;
  }

  async saveFromUrl(url: string, filePath: string): Promise<string> {
    const fullPath = this.getFullPath(filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
    });

    const writer = createWriteStream(fullPath);
    await pipeline(response.data, writer);

    return fullPath;
  }

  async get(filePath: string): Promise<Buffer> {
    const fullPath = this.getFullPath(filePath);
    return fs.readFile(fullPath);
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = this.getFullPath(filePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = this.getFullPath(filePath);
    await fs.unlink(fullPath);
  }

  async saveJSON(filePath: string, data: any): Promise<string> {
    const json = JSON.stringify(data, null, 2);
    return this.save(filePath, Buffer.from(json, 'utf-8'));
  }

  async getJSON<T>(filePath: string): Promise<T> {
    const buffer = await this.get(filePath);
    return JSON.parse(buffer.toString('utf-8'));
  }

  async listDirectories(relativePath: string = ''): Promise<string[]> {
    const fullPath = this.getFullPath(relativePath);
    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => (relativePath ? `${relativePath}/${entry.name}` : entry.name));
    } catch {
      return [];
    }
  }
}

// Factory function
export function createStorage(): IStorage {
  const storageType = process.env.STORAGE_TYPE || 'local';

  if (storageType === 'local') {
    return new LocalStorage();
  }

  // Future: Add cloud storage providers here
  // if (storageType === 'cloud') {
  //   return new S3Storage();
  // }

  throw new Error(`Unknown storage type: ${storageType}`);
}
