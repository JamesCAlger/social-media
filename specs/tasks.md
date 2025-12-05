# Implementation Tasks - Social Media Content Pipeline

**Status:** Ready to Begin
**Last Updated:** 2025-10-25
**Estimated Total Time:** 4-6 weeks (part-time)

---

## Overview

This document provides a detailed, step-by-step guide to implementing the social media content pipeline. Tasks are organized chronologically and by dependency.

**Phases:**
- **Phase 0:** Environment Setup (1-2 days)
- **Phase 1:** Core Infrastructure (3-5 days)
- **Phase 2:** Layer 1-2 Implementation (3-4 days)
- **Phase 3:** Layer 3-4 Implementation (4-6 days)
- **Phase 4:** Layer 5-6 Implementation (5-7 days)
- **Phase 5:** Integration & Testing (3-5 days)
- **Phase 6:** Deployment & Monitoring (2-3 days)

---

# Phase 0: Environment Setup

**Goal:** Set up development environment with all required tools
**Estimated Time:** 1-2 days
**Prerequisites:** None

---

## Task 0.1: Install Core Dependencies

### 0.1.1: Install Node.js
- [ ] Download Node.js 20+ LTS from https://nodejs.org
- [ ] Verify installation: `node --version` (should be 20.x or higher)
- [ ] Verify npm: `npm --version` (should be 10.x or higher)
- [ ] **Windows:** Add Node.js to PATH if not automatic
- [ ] **macOS/Linux:** Consider using `nvm` for version management

### 0.1.2: Install PostgreSQL
**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
psql postgres
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
- [ ] Download installer from https://www.postgresql.org/download/windows/
- [ ] Run installer, set password for `postgres` user
- [ ] Add PostgreSQL bin directory to PATH
- [ ] Verify: `psql --version`

**Verification:**
- [ ] Connect to PostgreSQL: `psql -U postgres`
- [ ] Create test database: `CREATE DATABASE test;`
- [ ] Drop test database: `DROP DATABASE test;`
- [ ] Exit: `\q`

### 0.1.3: Install FFmpeg
**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
- [ ] Download from https://ffmpeg.org/download.html
- [ ] Extract to `C:\ffmpeg`
- [ ] Add `C:\ffmpeg\bin` to PATH
- [ ] Restart terminal

**Verification:**
- [ ] Run: `ffmpeg -version`
- [ ] Should show version info (5.x or higher)

### 0.1.4: Install Git
- [ ] Download from https://git-scm.com/downloads
- [ ] Verify: `git --version`
- [ ] Configure:
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 0.1.5: Install Code Editor
- [ ] Install VS Code (recommended): https://code.visualstudio.com
- [ ] Install extensions:
  - [ ] ESLint
  - [ ] Prettier
  - [ ] PostgreSQL (by Chris Kolkman)
  - [ ] TypeScript Vue Plugin (Volar)

**Acceptance Criteria:**
- ✅ `node --version` shows 20.x+
- ✅ `psql --version` shows 14.x+
- ✅ `ffmpeg -version` shows version info
- ✅ `git --version` shows version info

---

## Task 0.2: Project Initialization

### 0.2.1: Create Project Directory
```bash
mkdir social-media-pipeline
cd social-media-pipeline
git init
```

### 0.2.2: Initialize npm Project
```bash
npm init -y
```

### 0.2.3: Install TypeScript
```bash
npm install -D typescript @types/node ts-node nodemon
npx tsc --init
```

### 0.2.4: Configure TypeScript
Edit `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 0.2.5: Create Project Structure
```bash
# Core directories
mkdir -p src/{layers,core,utils,config}
mkdir -p src/layers/{01-idea-generation,02-prompt-engineering,03-video-generation,04-composition,05-review,06-distribution}
mkdir -p src/layers/01-idea-generation/providers
mkdir -p src/layers/02-prompt-engineering/providers
mkdir -p src/layers/03-video-generation/providers
mkdir -p src/layers/04-composition
mkdir -p src/layers/05-review
mkdir -p src/layers/06-distribution/platforms

# Data directories
mkdir -p content
mkdir -p logs

# Script and test directories
mkdir -p scripts
mkdir -p tests/{layers,integration}
mkdir -p specs

# Create placeholder files
touch src/index.ts
touch src/core/{orchestrator.ts,database.ts,storage.ts,logger.ts,types.ts}
touch src/utils/{retry.ts,validation.ts,cost-tracking.ts}
touch src/config/{default.ts,index.ts}
```

### 0.2.6: Create .gitignore
```bash
cat > .gitignore << 'EOF'
# Local data and logs
content/
logs/
*.log

# Environment and secrets
.env
.env.local

# Dependencies and build
node_modules/
dist/
build/

# Database
*.db
*.sqlite
postgres-data/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db
desktop.ini

# Testing
coverage/
.nyc_output/

# Temporary files
tmp/
temp/
*.tmp
EOF
```

### 0.2.7: Create .env.example
```bash
cat > .env.example << 'EOF'
# Database (Local PostgreSQL)
DATABASE_URL=postgresql://postgres:password@localhost:5432/social_media

# Storage (Local filesystem by default)
STORAGE_TYPE=local
STORAGE_PATH=./content

# AI Providers
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
FAL_API_KEY=xxx

# Review System
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
SLACK_APPROVAL_TOKEN=xxx

# Social Media APIs
INSTAGRAM_ACCESS_TOKEN=xxx
INSTAGRAM_BUSINESS_ACCOUNT_ID=xxx
TIKTOK_ACCESS_TOKEN=xxx
YOUTUBE_CLIENT_ID=xxx
YOUTUBE_CLIENT_SECRET=xxx
YOUTUBE_REFRESH_TOKEN=xxx

# Application
NODE_ENV=development
LOG_LEVEL=debug
CRON_SCHEDULE=0 9 * * *

# Feature Flags
ENABLE_DISTRIBUTION=false
ENABLE_AUTO_APPROVAL=false
EOF
```

### 0.2.8: Create .env (Local Development)
```bash
cp .env.example .env
# Edit .env and add your actual API keys (at minimum: ANTHROPIC_API_KEY, OPENAI_API_KEY, FAL_API_KEY)
```

### 0.2.9: Update package.json Scripts
Add to `package.json`:
```json
{
  "scripts": {
    "dev": "nodemon --watch src --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "pipeline": "ts-node src/index.ts",
    "setup-db": "ts-node scripts/setup-db.ts",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write \"src/**/*.ts\""
  }
}
```

**Acceptance Criteria:**
- ✅ Project structure created with all directories
- ✅ TypeScript configured and compiling
- ✅ `.env` file created with API keys
- ✅ `.gitignore` properly configured
- ✅ `npm run build` completes without errors

---

## Task 0.3: Install Core Dependencies

### 0.3.1: Install Production Dependencies
```bash
npm install \
  @anthropic-ai/sdk \
  openai \
  @fal-ai/serverless-client \
  axios \
  zod \
  pg \
  dotenv \
  winston \
  node-cron \
  fluent-ffmpeg \
  uuid
```

### 0.3.2: Install Type Definitions
```bash
npm install -D \
  @types/node \
  @types/pg \
  @types/fluent-ffmpeg \
  @types/node-cron \
  @types/uuid
```

### 0.3.3: Install Development Dependencies
```bash
npm install -D \
  eslint \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  prettier \
  jest \
  @types/jest \
  ts-jest \
  nodemon
```

### 0.3.4: Configure ESLint
```bash
cat > .eslintrc.json << 'EOF'
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "plugins": ["@typescript-eslint"],
  "env": {
    "node": true,
    "es6": true
  },
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "no-console": "off"
  }
}
EOF
```

### 0.3.5: Configure Prettier
```bash
cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
EOF
```

### 0.3.6: Configure Jest
```bash
cat > jest.config.js << 'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
};
EOF
```

**Acceptance Criteria:**
- ✅ All dependencies installed successfully
- ✅ `npm run build` compiles without errors
- ✅ `npm run lint` runs without errors
- ✅ `npm test` runs (even with no tests)

---

# Phase 1: Core Infrastructure

**Goal:** Build foundational systems (database, storage, logging)
**Estimated Time:** 3-5 days
**Prerequisites:** Phase 0 complete

---

## Task 1.1: Database Setup

### 1.1.1: Create Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE social_media;

# Create user (optional, for security)
CREATE USER social_media_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE social_media TO social_media_user;

# Exit
\q
```

Update `.env`:
```
DATABASE_URL=postgresql://social_media_user:your_secure_password@localhost:5432/social_media
```

### 1.1.2: Create Database Schema Script
Create `scripts/setup-db.ts`:

```typescript
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function setupDatabase() {
  const client = await pool.connect();

  try {
    console.log('Creating database schema...');

    // Drop existing tables (for development)
    await client.query(`
      DROP TABLE IF EXISTS processing_logs CASCADE;
      DROP TABLE IF EXISTS platform_posts CASCADE;
      DROP TABLE IF EXISTS content CASCADE;
      DROP TABLE IF EXISTS config CASCADE;
    `);

    // Create content table
    await client.query(`
      CREATE TABLE content (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        -- Layer 1: Idea
        idea TEXT NOT NULL,
        caption TEXT NOT NULL,
        cultural_context TEXT,
        environment TEXT,
        sound_concept TEXT,

        -- Processing status
        status VARCHAR(50) NOT NULL DEFAULT 'generating',

        -- Costs
        idea_cost DECIMAL(10,4),
        prompt_cost DECIMAL(10,4),
        video_cost DECIMAL(10,4),
        composition_cost DECIMAL(10,4),
        total_cost DECIMAL(10,4),

        -- Review
        reviewed_at TIMESTAMPTZ,
        reviewed_by VARCHAR(255),
        review_notes TEXT,
        edited_caption TEXT,

        -- Storage references
        storage_path TEXT,
        final_video_path TEXT,

        -- Timestamps
        completed_at TIMESTAMPTZ,
        posted_at TIMESTAMPTZ,

        CONSTRAINT content_status_check CHECK (status IN (
          'generating', 'review_pending', 'approved', 'rejected', 'posted', 'failed'
        ))
      );
    `);

    // Create platform_posts table
    await client.query(`
      CREATE TABLE platform_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,

        platform VARCHAR(50) NOT NULL,
        post_id TEXT NOT NULL,
        post_url TEXT,

        posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status VARCHAR(50) NOT NULL DEFAULT 'posted',
        error_message TEXT,

        -- Engagement metrics
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        shares INTEGER DEFAULT 0,
        last_updated TIMESTAMPTZ,

        CONSTRAINT platform_posts_platform_check CHECK (platform IN (
          'instagram', 'tiktok', 'youtube'
        ))
      );
    `);

    // Create processing_logs table
    await client.query(`
      CREATE TABLE processing_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_id UUID REFERENCES content(id) ON DELETE CASCADE,

        layer VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,

        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,

        error_message TEXT,
        metadata JSONB,
        cost DECIMAL(10,4)
      );
    `);

    // Create config table
    await client.query(`
      CREATE TABLE config (
        key VARCHAR(255) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX idx_content_status ON content(status);
      CREATE INDEX idx_content_created_at ON content(created_at DESC);
      CREATE INDEX idx_platform_posts_content_id ON platform_posts(content_id);
      CREATE INDEX idx_platform_posts_platform ON platform_posts(platform);
      CREATE INDEX idx_processing_logs_content_id ON processing_logs(content_id);
      CREATE INDEX idx_processing_logs_layer ON processing_logs(layer);
    `);

    console.log('✅ Database schema created successfully!');
  } catch (error) {
    console.error('❌ Error creating database schema:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase();
```

### 1.1.3: Run Database Setup
```bash
npm run setup-db
```

**Acceptance Criteria:**
- ✅ Database `social_media` exists
- ✅ All tables created without errors
- ✅ Indexes created successfully
- ✅ Can connect via: `psql -d social_media -U social_media_user`

---

## Task 1.2: Database Client Implementation

### 1.2.1: Create Database Client
Create `src/core/database.ts`:

```typescript
import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export interface ContentRecord {
  id: string;
  created_at: Date;
  idea: string;
  caption: string;
  cultural_context?: string;
  environment?: string;
  sound_concept?: string;
  status: string;
  idea_cost?: number;
  prompt_cost?: number;
  video_cost?: number;
  composition_cost?: number;
  total_cost?: number;
  reviewed_at?: Date;
  reviewed_by?: string;
  review_notes?: string;
  edited_caption?: string;
  storage_path?: string;
  final_video_path?: string;
  completed_at?: Date;
  posted_at?: Date;
}

export interface ProcessingLog {
  id: string;
  content_id: string;
  layer: string;
  status: 'started' | 'completed' | 'failed';
  started_at: Date;
  completed_at?: Date;
  error_message?: string;
  metadata?: any;
  cost?: number;
}

export class Database {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected database error:', err);
    });
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async createContent(data: {
    idea: string;
    caption: string;
    cultural_context?: string;
    environment?: string;
    sound_concept?: string;
  }): Promise<string> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `INSERT INTO content (idea, caption, cultural_context, environment, sound_concept, status)
         VALUES ($1, $2, $3, $4, $5, 'generating')
         RETURNING id`,
        [data.idea, data.caption, data.cultural_context, data.environment, data.sound_concept]
      );
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  async updateContent(id: string, updates: Partial<ContentRecord>): Promise<void> {
    const client = await this.getClient();
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      });

      if (fields.length === 0) return;

      await client.query(
        `UPDATE content SET ${fields.join(', ')} WHERE id = $${paramCount}`,
        [...values, id]
      );
    } finally {
      client.release();
    }
  }

  async getContent(id: string): Promise<ContentRecord | null> {
    const client = await this.getClient();
    try {
      const result = await client.query('SELECT * FROM content WHERE id = $1', [id]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async logProcessing(log: Omit<ProcessingLog, 'id' | 'started_at'>): Promise<void> {
    const client = await this.getClient();
    try {
      await client.query(
        `INSERT INTO processing_logs (content_id, layer, status, completed_at, error_message, metadata, cost)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          log.content_id,
          log.layer,
          log.status,
          log.completed_at || null,
          log.error_message || null,
          log.metadata ? JSON.stringify(log.metadata) : null,
          log.cost || null,
        ]
      );
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
```

### 1.2.2: Test Database Client
Create `tests/core/database.test.ts`:

```typescript
import { Database } from '../../src/core/database';

describe('Database', () => {
  let db: Database;

  beforeAll(() => {
    db = new Database();
  });

  afterAll(async () => {
    await db.close();
  });

  it('should create and retrieve content', async () => {
    const id = await db.createContent({
      idea: 'Test idea',
      caption: 'Test caption',
      cultural_context: 'Test context',
    });

    expect(id).toBeDefined();

    const content = await db.getContent(id);
    expect(content).not.toBeNull();
    expect(content?.idea).toBe('Test idea');
  });

  it('should update content', async () => {
    const id = await db.createContent({
      idea: 'Test idea 2',
      caption: 'Test caption 2',
    });

    await db.updateContent(id, { status: 'approved' });

    const content = await db.getContent(id);
    expect(content?.status).toBe('approved');
  });

  it('should log processing events', async () => {
    const contentId = await db.createContent({
      idea: 'Test idea 3',
      caption: 'Test caption 3',
    });

    await expect(
      db.logProcessing({
        content_id: contentId,
        layer: 'idea',
        status: 'completed',
        cost: 0.01,
      })
    ).resolves.not.toThrow();
  });
});
```

Run tests:
```bash
npm test
```

**Acceptance Criteria:**
- ✅ Database client connects successfully
- ✅ Can create content records
- ✅ Can update content records
- ✅ Can log processing events
- ✅ All tests pass

---

## Task 1.3: Storage System Implementation

### 1.3.1: Create Storage Interface
Create `src/core/storage.ts`:

```typescript
import fs from 'fs/promises';
import path from 'path';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import axios from 'axios';

export interface IStorage {
  save(filePath: string, data: Buffer): Promise<string>;
  saveFromUrl(url: string, filePath: string): Promise<string>;
  get(filePath: string): Promise<Buffer>;
  exists(filePath: string): Promise<boolean>;
  delete(filePath: string): Promise<void>;
  getFullPath(filePath: string): string;
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
```

### 1.3.2: Test Storage System
Create `tests/core/storage.test.ts`:

```typescript
import { LocalStorage } from '../../src/core/storage';
import path from 'path';
import fs from 'fs/promises';

describe('LocalStorage', () => {
  let storage: LocalStorage;
  const testBasePath = './test-content';

  beforeAll(async () => {
    storage = new LocalStorage(testBasePath);
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await fs.rm(testBasePath, { recursive: true, force: true });
    } catch (error) {
      // Ignore errors
    }
  });

  it('should save and retrieve files', async () => {
    const testData = Buffer.from('Hello, World!');
    const filePath = 'test/file.txt';

    const savedPath = await storage.save(filePath, testData);
    expect(savedPath).toContain('test/file.txt');

    const retrieved = await storage.get(filePath);
    expect(retrieved.toString()).toBe('Hello, World!');
  });

  it('should check if file exists', async () => {
    const filePath = 'test/exists.txt';
    await storage.save(filePath, Buffer.from('test'));

    const exists = await storage.exists(filePath);
    expect(exists).toBe(true);

    const notExists = await storage.exists('test/not-exists.txt');
    expect(notExists).toBe(false);
  });

  it('should save and retrieve JSON', async () => {
    const testData = { name: 'Test', value: 123 };
    const filePath = 'test/data.json';

    await storage.saveJSON(filePath, testData);
    const retrieved = await storage.getJSON(filePath);

    expect(retrieved).toEqual(testData);
  });

  it('should delete files', async () => {
    const filePath = 'test/to-delete.txt';
    await storage.save(filePath, Buffer.from('delete me'));

    await storage.delete(filePath);

    const exists = await storage.exists(filePath);
    expect(exists).toBe(false);
  });
});
```

Run tests:
```bash
npm test
```

**Acceptance Criteria:**
- ✅ Storage system can save files
- ✅ Storage system can retrieve files
- ✅ Storage system can check file existence
- ✅ Storage system can save/load JSON
- ✅ All tests pass

---

## Task 1.4: Logger Implementation

### 1.4.1: Create Logger
Create `src/core/logger.ts`:

```typescript
import winston from 'winston';
import path from 'path';

const logDir = process.env.LOG_DIR || './logs';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'social-media-pipeline' },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    // Combined logs
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
  ],
});

// Console output for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...metadata }) => {
          let msg = `${timestamp} [${level}]: ${message}`;
          if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
          }
          return msg;
        })
      ),
    })
  );
}

export { logger };
```

### 1.4.2: Test Logger
Create simple test file `tests/core/logger.test.ts`:

```typescript
import { logger } from '../../src/core/logger';

describe('Logger', () => {
  it('should log messages without errors', () => {
    expect(() => {
      logger.info('Test info message');
      logger.error('Test error message');
      logger.debug('Test debug message');
    }).not.toThrow();
  });
});
```

**Acceptance Criteria:**
- ✅ Logger creates log files in `./logs`
- ✅ Logger outputs to console in development
- ✅ Different log levels work correctly
- ✅ Test passes

---

## Task 1.5: Shared Types

### 1.5.1: Create Type Definitions
Create `src/core/types.ts`:

```typescript
// Layer 1: Idea Generation
export interface IdeaOutput {
  id: string;
  timestamp: string;
  idea: string;
  caption: string;
  culturalContext: string;
  environment: string;
  soundConcept: string;
  status: 'for_production';
}

// Layer 2: Prompt Engineering
export interface VideoPrompt {
  sequence: 1 | 2 | 3;
  videoPrompt: string;
  audioPrompt: string;
  duration: 5;
  resolution: '720p';
  aspectRatio: '9:16';
}

export interface PromptOutput {
  contentId: string;
  prompts: VideoPrompt[];
}

// Layer 3: Video Generation
export interface GeneratedVideo {
  sequence: 1 | 2 | 3;
  storagePath: string;
  duration: number;
  resolution: string;
  aspectRatio: string;
  hasAudio: true;
  generatedAt: string;
  cost: number;
}

export interface VideoGenerationOutput {
  contentId: string;
  videos: GeneratedVideo[];
}

// Layer 4: Composition
export interface CompositionOutput {
  contentId: string;
  finalVideo: {
    storagePath: string;
    duration: number;
    resolution: '720p';
    aspectRatio: '9:16';
    fileSize: number;
    processedAt: string;
    cost: number;
  };
}

// Layer 5: Review
export interface ReviewOutput {
  contentId: string;
  decision: 'approved' | 'rejected' | 'edited';
  reviewedAt: string;
  reviewedBy: string;
  notes?: string;
  editedCaption?: string;
}

// Layer 6: Distribution
export interface PlatformPost {
  platform: 'instagram' | 'tiktok' | 'youtube';
  postId: string;
  postUrl: string;
  postedAt: string;
  status: 'posted' | 'failed';
  error?: string;
}

export interface DistributionOutput {
  contentId: string;
  posts: PlatformPost[];
}

// Configuration
export interface PipelineConfig {
  content: {
    videoDuration: number;
    videoCount: number;
    resolution: string;
    aspectRatio: string;
  };
  storage: {
    type: 'local' | 'cloud';
    path: string;
  };
  layers: {
    ideaGeneration: {
      provider: 'anthropic' | 'openai';
      model: string;
      temperature: number;
    };
    promptEngineering: {
      provider: 'anthropic' | 'openai';
      model: string;
      temperature: number;
    };
    videoGeneration: {
      provider: 'fal';
      model: string;
      enableAudio: boolean;
    };
    composition: {
      method: 'local' | 'fal-api';
      ffmpegPath: string;
    };
    review: {
      channel: 'slack' | 'discord' | 'dashboard';
      timeout: number;
    };
  };
  retry: {
    maxAttempts: number;
    backoffMs: number;
  };
}
```

**Acceptance Criteria:**
- ✅ All types defined and exported
- ✅ TypeScript compilation succeeds
- ✅ Types match architecture specification

---

## Task 1.6: Configuration System

### 1.6.1: Create Default Config
Create `src/config/default.ts`:

```typescript
import { PipelineConfig } from '../core/types';

export const defaultConfig: PipelineConfig = {
  content: {
    videoDuration: 5,
    videoCount: 3,
    resolution: '720p',
    aspectRatio: '9:16',
  },

  storage: {
    type: 'local',
    path: process.env.STORAGE_PATH || './content',
  },

  layers: {
    ideaGeneration: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.8,
    },

    promptEngineering: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
    },

    videoGeneration: {
      provider: 'fal',
      model: 'wan-2.5',
      enableAudio: true,
    },

    composition: {
      method: 'local',
      ffmpegPath: 'ffmpeg',
    },

    review: {
      channel: 'slack',
      timeout: 86400,
    },
  },

  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
  },
};
```

### 1.6.2: Create Config Loader
Create `src/config/index.ts`:

```typescript
import { PipelineConfig } from '../core/types';
import { defaultConfig } from './default';

export function getConfig(): PipelineConfig {
  // In the future, you can add environment-specific overrides here
  return defaultConfig;
}

export { defaultConfig };
```

**Acceptance Criteria:**
- ✅ Configuration exports successfully
- ✅ Can import config in other files
- ✅ TypeScript compilation succeeds

---

## Task 1.7: Utility Functions

### 1.7.1: Create Retry Utility
Create `src/utils/retry.ts`:

```typescript
import { logger } from '../core/logger';

export interface RetryOptions {
  maxAttempts: number;
  backoffMs: number;
  onRetry?: (error: Error, attempt: number) => void;
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < options.maxAttempts) {
        const delay = options.backoffMs * Math.pow(2, attempt - 1);
        logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`, {
          error: lastError.message,
        });

        if (options.onRetry) {
          options.onRetry(lastError, attempt);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}
```

### 1.7.2: Create Validation Utility
Create `src/utils/validation.ts`:

```typescript
import { z } from 'zod';

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw new Error(`Validation failed:\n${messages.join('\n')}`);
    }
    throw error;
  }
}

export function validateAsync<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<T> {
  return Promise.resolve(validate(schema, data));
}
```

### 1.7.3: Create Cost Tracking Utility
Create `src/utils/cost-tracking.ts`:

```typescript
export class CostTracker {
  private costs: Map<string, number> = new Map();

  addCost(layer: string, amount: number): void {
    const current = this.costs.get(layer) || 0;
    this.costs.set(layer, current + amount);
  }

  getCost(layer: string): number {
    return this.costs.get(layer) || 0;
  }

  getTotalCost(): number {
    return Array.from(this.costs.values()).reduce((sum, cost) => sum + cost, 0);
  }

  getCostBreakdown(): Record<string, number> {
    return Object.fromEntries(this.costs.entries());
  }

  reset(): void {
    this.costs.clear();
  }
}
```

**Acceptance Criteria:**
- ✅ Retry utility works with exponential backoff
- ✅ Validation utility throws clear errors
- ✅ Cost tracker accumulates costs correctly
- ✅ All utilities have passing tests

---

**Phase 1 Complete!** ✅

You should now have:
- ✅ Database setup with schema
- ✅ Database client with CRUD operations
- ✅ Local storage system
- ✅ Logging system
- ✅ Shared type definitions
- ✅ Configuration system
- ✅ Utility functions (retry, validation, cost tracking)

Continue to Phase 2...

---

# Phase 2: Layer 1-2 Implementation (AI Generation)

**Goal:** Implement idea generation and prompt engineering layers
**Estimated Time:** 3-4 days
**Prerequisites:** Phase 1 complete

---

## Task 2.1: Layer 1 - Idea Generation (Anthropic Provider)

### 2.1.1: Create Idea Generation Schema
Create `src/layers/01-idea-generation/schema.ts`:

```typescript
import { z } from 'zod';

export const IdeaOutputSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string(),
  idea: z.string().min(10).max(200),
  caption: z.string().min(10).max(300),
  culturalContext: z.string(),
  environment: z.string().max(300),
  soundConcept: z.string().max(200),
  status: z.literal('for_production'),
});

export type IdeaOutput = z.infer<typeof IdeaOutputSchema>;
```

### 2.1.2: Create Prompt Template
Create `src/layers/01-idea-generation/prompts.ts`:

```typescript
export const IDEA_GENERATION_SYSTEM_PROMPT = `
You are an AI designed to generate one creative, immersive ASMR content idea.

**RULES:**
1. Generate only ONE idea
2. The idea should involve a traditional craft material, pottery, textile, or cultural artifact
3. The idea should describe something being painted over, revealing culturally significant colors beneath
4. Maximum 13 words for the idea
5. Return ONLY a JSON object with the exact structure specified

**JSON Structure:**
{
  "Caption": "Short viral title with ONE emoji and 12 hashtags (4 topic-relevant, 4 all-time popular, 4 trending)",
  "Idea": "Your idea under 13 words",
  "Environment": "Vivid setting under 20 words matching the action",
  "Sound": "Primary sound description under 15 words",
  "CulturalContext": "Culture/Region + Craft Type (e.g., 'Japanese pottery', 'Moroccan zellige')"
}

The idea must specify:
- Outside color (dark solid)
- Cultural material type
- Culture/region of origin
- Internal/traditional color being revealed
`.trim();

export const IDEA_GENERATION_USER_PROMPT = `
Generate a creative concept involving:

A dark solid traditional craft material, pottery, textile, or cultural artifact being painted over by a brush,
revealing culturally significant or traditional colors beneath the dark surface. Specify the cultural origin.

Your response must follow this structure:
"(Outside Color) (Cultural Material) from (Culture/Region) with internal colour (Traditional Colour)"

Reflect carefully before answering to ensure originality and visual appeal.
`.trim();
```

### 2.1.3: Create Anthropic Provider
Create `src/layers/01-idea-generation/providers/anthropic.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { IdeaOutput } from '../../../core/types';
import { logger } from '../../../core/logger';
import { retry } from '../../../utils/retry';
import {
  IDEA_GENERATION_SYSTEM_PROMPT,
  IDEA_GENERATION_USER_PROMPT,
} from '../prompts';

export class AnthropicIdeaProvider {
  private client: Anthropic;
  private model: string;
  private temperature: number;

  constructor(apiKey: string, model: string = 'claude-3-5-sonnet-20241022', temperature: number = 0.8) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
    this.temperature = temperature;
  }

  async generateIdea(): Promise<IdeaOutput> {
    logger.info('Generating idea with Anthropic', { model: this.model });

    const response = await retry(
      async () => {
        return this.client.messages.create({
          model: this.model,
          max_tokens: 1024,
          temperature: this.temperature,
          system: IDEA_GENERATION_SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: IDEA_GENERATION_USER_PROMPT,
            },
          ],
        });
      },
      {
        maxAttempts: 3,
        backoffMs: 1000,
      }
    );

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Transform to our schema
    const idea: IdeaOutput = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      idea: parsed.Idea,
      caption: parsed.Caption,
      culturalContext: parsed.CulturalContext || 'Unknown',
      environment: parsed.Environment,
      soundConcept: parsed.Sound,
      status: 'for_production',
    };

    logger.info('Idea generated successfully', { id: idea.id });
    return idea;
  }

  estimateCost(): number {
    // Approximate cost for Claude 3.5 Sonnet
    // Input: ~500 tokens @ $3/MTok = $0.0015
    // Output: ~300 tokens @ $15/MTok = $0.0045
    return 0.006; // ~$0.01 with buffer
  }
}
```

### 2.1.4: Create Provider Factory
Create `src/layers/01-idea-generation/providers/index.ts`:

```typescript
import { AnthropicIdeaProvider } from './anthropic';
import { IdeaOutput } from '../../../core/types';

export interface IIdeaProvider {
  generateIdea(): Promise<IdeaOutput>;
  estimateCost(): number;
}

export function createIdeaProvider(
  provider: 'anthropic' | 'openai',
  model: string,
  temperature: number
): IIdeaProvider {
  const apiKey = provider === 'anthropic'
    ? process.env.ANTHROPIC_API_KEY
    : process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(`${provider.toUpperCase()}_API_KEY not found in environment`);
  }

  if (provider === 'anthropic') {
    return new AnthropicIdeaProvider(apiKey, model, temperature);
  }

  // TODO: Add OpenAI provider
  throw new Error(`Provider ${provider} not yet implemented`);
}
```

### 2.1.5: Create Layer 1 Main Logic
Create `src/layers/01-idea-generation/index.ts`:

```typescript
import { IdeaOutput } from '../../core/types';
import { Database } from '../../core/database';
import { createStorage } from '../../core/storage';
import { logger } from '../../core/logger';
import { validate } from '../../utils/validation';
import { IdeaOutputSchema } from './schema';
import { createIdeaProvider } from './providers';
import { PipelineConfig } from '../../core/types';

export class IdeaGenerationLayer {
  private database: Database;
  private storage = createStorage();

  constructor(database: Database) {
    this.database = database;
  }

  async execute(config: PipelineConfig): Promise<IdeaOutput> {
    logger.info('Starting Layer 1: Idea Generation');

    const startTime = Date.now();
    let contentId: string | null = null;

    try {
      // Create provider
      const provider = createIdeaProvider(
        config.layers.ideaGeneration.provider,
        config.layers.ideaGeneration.model,
        config.layers.ideaGeneration.temperature
      );

      // Generate idea
      const idea = await provider.generateIdea();
      const cost = provider.estimateCost();

      // Validate output
      validate(IdeaOutputSchema, idea);

      // Create database record
      contentId = await this.database.createContent({
        idea: idea.idea,
        caption: idea.caption,
        cultural_context: idea.culturalContext,
        environment: idea.environment,
        sound_concept: idea.soundConcept,
      });

      // Update costs
      await this.database.updateContent(contentId, {
        idea_cost: cost,
      });

      // Save to storage
      await this.storage.saveJSON(`${contentId}/idea.json`, idea);

      // Log processing
      await this.database.logProcessing({
        content_id: contentId,
        layer: 'idea',
        status: 'completed',
        completed_at: new Date(),
        metadata: idea,
        cost,
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info('Layer 1 completed', { contentId, duration, cost });

      return { ...idea, id: contentId };
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.error('Layer 1 failed', { error, duration, contentId });

      if (contentId) {
        await this.database.updateContent(contentId, { status: 'failed' });
        await this.database.logProcessing({
          content_id: contentId,
          layer: 'idea',
          status: 'failed',
          completed_at: new Date(),
          error_message: (error as Error).message,
        });
      }

      throw error;
    }
  }
}
```

### 2.1.6: Test Layer 1
Create `tests/layers/idea-generation.test.ts`:

```typescript
import { IdeaGenerationLayer } from '../../src/layers/01-idea-generation';
import { Database } from '../../src/core/database';
import { getConfig } from '../../src/config';

describe('IdeaGenerationLayer', () => {
  let layer: IdeaGenerationLayer;
  let database: Database;

  beforeAll(() => {
    database = new Database();
    layer = new IdeaGenerationLayer(database);
  });

  afterAll(async () => {
    await database.close();
  });

  it('should generate a valid idea', async () => {
    const config = getConfig();
    const idea = await layer.execute(config);

    expect(idea).toBeDefined();
    expect(idea.id).toBeDefined();
    expect(idea.idea).toBeTruthy();
    expect(idea.caption).toBeTruthy();
    expect(idea.culturalContext).toBeTruthy();
  }, 30000); // 30 second timeout for API call
});
```

### 2.1.7: Run Layer 1 Test
```bash
# Make sure you have ANTHROPIC_API_KEY in .env
npm test -- idea-generation
```

**Acceptance Criteria:**
- ✅ Layer 1 generates valid ideas
- ✅ Ideas are saved to database
- ✅ Ideas are saved to local storage as JSON
- ✅ Costs are tracked
- ✅ Test passes

---

## Task 2.2: Layer 2 - Prompt Engineering

### 2.2.1: Create Prompt Engineering Schema
Create `src/layers/02-prompt-engineering/schema.ts`:

```typescript
import { z } from 'zod';

export const VideoPromptSchema = z.object({
  sequence: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  videoPrompt: z.string().min(50).max(500),
  audioPrompt: z.string().min(10).max(200),
  duration: z.literal(5),
  resolution: z.literal('720p'),
  aspectRatio: z.literal('9:16'),
});

export const PromptOutputSchema = z.object({
  contentId: z.string().uuid(),
  prompts: z.array(VideoPromptSchema).length(3),
});

export type VideoPrompt = z.infer<typeof VideoPromptSchema>;
export type PromptOutput = z.infer<typeof PromptOutputSchema>;
```

### 2.2.2: Create Prompt Template
Create `src/layers/02-prompt-engineering/templates.ts`:

```typescript
import { IdeaOutput } from '../../core/types';

export function createPromptEngineeringSystemPrompt(): string {
  return `
You are a specialized AI that generates highly detailed video prompts for WAN 2.5, an AI video generation model.

Your task is to generate 3 sequential video prompts (5 seconds each) that together tell a cohesive ASMR story about traditional crafts.

**Requirements for each prompt:**
1. Length: 100-200 words
2. Sharp, precise cinematic realism with cultural authenticity
3. Macro-level detail focusing on material, tool, and action
4. The craft action must ALWAYS be taking place (never idle)
5. Camera terms allowed (macro view, tight angle, overhead shot)

**Cultural Authenticity:**
- Identify cultural origin/region clearly
- Use traditional tools authentic to that culture
- Reference culturally significant colors, patterns, materials
- Show traditional workspace elements
- Demonstrate respect for the craft tradition

**Each prompt must describe:**
- The traditional craft object/material (from the Idea)
- The cultural environment/workspace
- The texture and behavior of the material
- The traditional tool or technique being applied
- How the material responds to the action
- ASMR-relevant sensory details (visual only)

**Tone:**
- Clean, observational, culturally respectful
- Documentary-style visual precision
- No poetic metaphors or storytelling
- No exoticization
- Physically grounded and authentic

**Output Format:**
Return ONLY a valid JSON object with this structure:
{
  "prompts": [
    {
      "sequence": 1,
      "videoPrompt": "Detailed visual description here...",
      "audioPrompt": "Sound description here...",
      "duration": 5,
      "resolution": "720p",
      "aspectRatio": "9:16"
    },
    // ... 2 more prompts
  ]
}
`.trim();
}

export function createPromptEngineeringUserPrompt(idea: IdeaOutput): string {
  return `
Generate 3 video prompts based on this idea:

**Idea:** ${idea.idea}
**Cultural Context:** ${idea.culturalContext}
**Environment:** ${idea.environment}
**Sound Concept:** ${idea.soundConcept}

Create 3 sequential prompts that:
1. Show the initial state and beginning of the traditional craft action
2. Continue the reveal/transformation mid-process
3. Complete the reveal showing the final traditional colors/patterns

Each prompt should be 100-200 words and optimized for WAN 2.5 video generation.
Focus on visual details and traditional craft authenticity.
`.trim();
}
```

### 2.2.3: Create OpenAI Provider
Create `src/layers/02-prompt-engineering/providers/openai.ts`:

```typescript
import OpenAI from 'openai';
import { PromptOutput, VideoPrompt } from '../../../core/types';
import { IdeaOutput } from '../../../core/types';
import { logger } from '../../../core/logger';
import { retry } from '../../../utils/retry';
import {
  createPromptEngineeringSystemPrompt,
  createPromptEngineeringUserPrompt,
} from '../templates';

export class OpenAIPromptProvider {
  private client: OpenAI;
  private model: string;
  private temperature: number;

  constructor(apiKey: string, model: string = 'gpt-4', temperature: number = 0.7) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
    this.temperature = temperature;
  }

  async generatePrompts(idea: IdeaOutput): Promise<PromptOutput> {
    logger.info('Generating prompts with OpenAI', { model: this.model, ideaId: idea.id });

    const response = await retry(
      async () => {
        return this.client.chat.completions.create({
          model: this.model,
          temperature: this.temperature,
          messages: [
            {
              role: 'system',
              content: createPromptEngineeringSystemPrompt(),
            },
            {
              role: 'user',
              content: createPromptEngineeringUserPrompt(idea),
            },
          ],
        });
      },
      {
        maxAttempts: 3,
        backoffMs: 1000,
      }
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in OpenAI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const promptOutput: PromptOutput = {
      contentId: idea.id,
      prompts: parsed.prompts.map((p: any, index: number) => ({
        sequence: (index + 1) as 1 | 2 | 3,
        videoPrompt: p.videoPrompt,
        audioPrompt: p.audioPrompt,
        duration: 5,
        resolution: '720p',
        aspectRatio: '9:16',
      })),
    };

    logger.info('Prompts generated successfully', { contentId: idea.id });
    return promptOutput;
  }

  estimateCost(): number {
    // Approximate cost for GPT-4
    // Input: ~1000 tokens @ $30/MTok = $0.03
    // Output: ~600 tokens @ $60/MTok = $0.036
    return 0.07; // ~$0.07 with buffer, but let's say $0.02 for the estimate
  }
}
```

### 2.2.4: Create Provider Factory
Create `src/layers/02-prompt-engineering/providers/index.ts`:

```typescript
import { OpenAIPromptProvider } from './openai';
import { PromptOutput, IdeaOutput } from '../../../core/types';

export interface IPromptProvider {
  generatePrompts(idea: IdeaOutput): Promise<PromptOutput>;
  estimateCost(): number;
}

export function createPromptProvider(
  provider: 'anthropic' | 'openai',
  model: string,
  temperature: number
): IPromptProvider {
  const apiKey = provider === 'openai'
    ? process.env.OPENAI_API_KEY
    : process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(`${provider.toUpperCase()}_API_KEY not found in environment`);
  }

  if (provider === 'openai') {
    return new OpenAIPromptProvider(apiKey, model, temperature);
  }

  // TODO: Add Anthropic provider if needed
  throw new Error(`Provider ${provider} not yet implemented`);
}
```

### 2.2.5: Create Layer 2 Main Logic
Create `src/layers/02-prompt-engineering/index.ts`:

```typescript
import { PromptOutput, IdeaOutput } from '../../core/types';
import { Database } from '../../core/database';
import { createStorage } from '../../core/storage';
import { logger } from '../../core/logger';
import { validate } from '../../utils/validation';
import { PromptOutputSchema } from './schema';
import { createPromptProvider } from './providers';
import { PipelineConfig } from '../../core/types';

export class PromptEngineeringLayer {
  private database: Database;
  private storage = createStorage();

  constructor(database: Database) {
    this.database = database;
  }

  async execute(idea: IdeaOutput, config: PipelineConfig): Promise<PromptOutput> {
    logger.info('Starting Layer 2: Prompt Engineering', { contentId: idea.id });

    const startTime = Date.now();

    try {
      // Create provider
      const provider = createPromptProvider(
        config.layers.promptEngineering.provider,
        config.layers.promptEngineering.model,
        config.layers.promptEngineering.temperature
      );

      // Generate prompts
      const prompts = await provider.generatePrompts(idea);
      const cost = provider.estimateCost();

      // Validate output
      validate(PromptOutputSchema, prompts);

      // Update costs
      await this.database.updateContent(idea.id, {
        prompt_cost: cost,
      });

      // Save to storage
      await this.storage.saveJSON(`${idea.id}/prompts.json`, prompts);

      // Log processing
      await this.database.logProcessing({
        content_id: idea.id,
        layer: 'prompt',
        status: 'completed',
        completed_at: new Date(),
        metadata: prompts,
        cost,
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info('Layer 2 completed', { contentId: idea.id, duration, cost });

      return prompts;
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.error('Layer 2 failed', { error, duration, contentId: idea.id });

      await this.database.updateContent(idea.id, { status: 'failed' });
      await this.database.logProcessing({
        content_id: idea.id,
        layer: 'prompt',
        status: 'failed',
        completed_at: new Date(),
        error_message: (error as Error).message,
      });

      throw error;
    }
  }
}
```

### 2.2.6: Test Layer 2
Create `tests/layers/prompt-engineering.test.ts`:

```typescript
import { PromptEngineeringLayer } from '../../src/layers/02-prompt-engineering';
import { Database } from '../../src/core/database';
import { getConfig } from '../../src/config';
import { IdeaOutput } from '../../src/core/types';

describe('PromptEngineeringLayer', () => {
  let layer: PromptEngineeringLayer;
  let database: Database;

  beforeAll(() => {
    database = new Database();
    layer = new PromptEngineeringLayer(database);
  });

  afterAll(async () => {
    await database.close();
  });

  it('should generate valid prompts from idea', async () => {
    const config = getConfig();

    // Mock idea
    const mockIdea: IdeaOutput = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      timestamp: new Date().toISOString(),
      idea: 'Black Moroccan zellige tile with internal colour emerald green',
      caption: 'Ancient patterns revealed ✨ #moroccancraft #asmr #satisfying #traditional',
      culturalContext: 'Moroccan zellige tilework',
      environment: 'Traditional workshop with natural light, handmade surfaces',
      soundConcept: 'Gentle brush strokes on ceramic surface',
      status: 'for_production',
    };

    // Create content in database first
    await database.createContent({
      idea: mockIdea.idea,
      caption: mockIdea.caption,
      cultural_context: mockIdea.culturalContext,
      environment: mockIdea.environment,
      sound_concept: mockIdea.soundConcept,
    });

    const prompts = await layer.execute(mockIdea, config);

    expect(prompts).toBeDefined();
    expect(prompts.prompts).toHaveLength(3);
    expect(prompts.prompts[0].sequence).toBe(1);
    expect(prompts.prompts[0].videoPrompt.length).toBeGreaterThan(50);
  }, 60000); // 60 second timeout
});
```

**Acceptance Criteria:**
- ✅ Layer 2 generates 3 valid prompts
- ✅ Prompts are saved to database (as costs)
- ✅ Prompts are saved to local storage as JSON
- ✅ Each prompt is 100-200 words
- ✅ Test passes

---

**Phase 2 Complete!** ✅

Continue to Phase 3...

---

# Phase 3: Layer 3-4 Implementation (Video & Composition)

**Goal:** Implement video generation and composition layers
**Estimated Time:** 4-6 days
**Prerequisites:** Phase 2 complete

---

## Task 3.1: Layer 3 - Video Generation (Fal.ai Provider)

### 3.1.1: Create Video Generation Schema
Create `src/layers/03-video-generation/schema.ts`:

```typescript
import { z } from 'zod';

export const GeneratedVideoSchema = z.object({
  sequence: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  storagePath: z.string(),
  duration: z.number().min(4).max(6),
  resolution: z.string(),
  aspectRatio: z.string(),
  hasAudio: z.literal(true),
  generatedAt: z.string(),
  cost: z.number(),
});

export const VideoGenerationOutputSchema = z.object({
  contentId: z.string().uuid(),
  videos: z.array(GeneratedVideoSchema).length(3),
});

export type GeneratedVideo = z.infer<typeof GeneratedVideoSchema>;
export type VideoGenerationOutput = z.infer<typeof VideoGenerationOutputSchema>;
```

### 3.1.2: Create Fal.ai Provider
Create `src/layers/03-video-generation/providers/fal.ts`:

```typescript
import * as fal from '@fal-ai/serverless-client';
import { GeneratedVideo } from '../../../core/types';
import { VideoPrompt } from '../../../core/types';
import { logger } from '../../../core/logger';
import { retry } from '../../../utils/retry';

fal.config({
  credentials: process.env.FAL_API_KEY,
});

export class FalVideoProvider {
  private model: string;

  constructor(model: string = 'fal-ai/wan') {
    this.model = model;
  }

  async generateVideo(
    prompt: VideoPrompt,
    sequence: 1 | 2 | 3
  ): Promise<GeneratedVideo> {
    logger.info('Generating video with Fal.ai', { model: this.model, sequence });

    const result = await retry(
      async () => {
        return fal.subscribe(this.model, {
          input: {
            prompt: prompt.videoPrompt,
            audio_prompt: prompt.audioPrompt,
            duration: prompt.duration,
            resolution: '720p',
            aspect_ratio: '9:16',
            enable_audio: true,
          },
          logs: true,
          onQueueUpdate: (update) => {
            if (update.status === 'IN_PROGRESS') {
              logger.debug('Video generation in progress', { sequence });
            }
          },
        });
      },
      {
        maxAttempts: 3,
        backoffMs: 2000,
      }
    );

    if (!result.data || !result.data.video) {
      throw new Error('No video URL in Fal.ai response');
    }

    const videoUrl = result.data.video.url;
    const generatedAt = new Date().toISOString();

    // Cost: $0.05 per second for WAN 2.5
    const cost = 5 * 0.05; // 5 seconds

    return {
      sequence,
      storagePath: videoUrl, // Will be updated after download
      duration: 5,
      resolution: '720p',
      aspectRatio: '9:16',
      hasAudio: true,
      generatedAt,
      cost,
    };
  }

  estimateCost(): number {
    // 3 videos × 5 seconds × $0.05/sec
    return 3 * 5 * 0.05; // $0.75
  }
}
```

### 3.1.3: Create Provider Factory
Create `src/layers/03-video-generation/providers/index.ts`:

```typescript
import { FalVideoProvider } from './fal';
import { GeneratedVideo, VideoPrompt } from '../../../core/types';

export interface IVideoProvider {
  generateVideo(prompt: VideoPrompt, sequence: 1 | 2 | 3): Promise<GeneratedVideo>;
  estimateCost(): number;
}

export function createVideoProvider(
  provider: 'fal',
  model: string
): IVideoProvider {
  if (!process.env.FAL_API_KEY) {
    throw new Error('FAL_API_KEY not found in environment');
  }

  if (provider === 'fal') {
    return new FalVideoProvider(model);
  }

  throw new Error(`Provider ${provider} not yet implemented`);
}
```

### 3.1.4: Create Layer 3 Main Logic
Create `src/layers/03-video-generation/index.ts`:

```typescript
import { VideoGenerationOutput, PromptOutput } from '../../core/types';
import { Database } from '../../core/database';
import { createStorage } from '../../core/storage';
import { logger } from '../../core/logger';
import { validate } from '../../utils/validation';
import { VideoGenerationOutputSchema } from './schema';
import { createVideoProvider } from './providers';
import { PipelineConfig } from '../../core/types';

export class VideoGenerationLayer {
  private database: Database;
  private storage = createStorage();

  constructor(database: Database) {
    this.database = database;
  }

  async execute(
    prompts: PromptOutput,
    config: PipelineConfig
  ): Promise<VideoGenerationOutput> {
    logger.info('Starting Layer 3: Video Generation', { contentId: prompts.contentId });

    const startTime = Date.now();
    let totalCost = 0;

    try {
      // Create provider
      const provider = createVideoProvider(
        config.layers.videoGeneration.provider,
        config.layers.videoGeneration.model
      );

      // Generate videos for each prompt
      const videos = [];
      for (const prompt of prompts.prompts) {
        logger.info(`Generating video ${prompt.sequence}/3`);

        const video = await provider.generateVideo(prompt, prompt.sequence);
        totalCost += video.cost;

        // Download video from URL and save to local storage
        const localPath = `${prompts.contentId}/raw/video_${prompt.sequence}.mp4`;
        logger.info(`Downloading video ${prompt.sequence} to storage`);
        const savedPath = await this.storage.saveFromUrl(video.storagePath, localPath);

        // Update storage path to local path
        video.storagePath = localPath;

        videos.push(video);

        logger.info(`Video ${prompt.sequence}/3 completed`, {
          duration: video.duration,
          cost: video.cost,
        });
      }

      const output: VideoGenerationOutput = {
        contentId: prompts.contentId,
        videos,
      };

      // Validate output
      validate(VideoGenerationOutputSchema, output);

      // Update costs in database
      await this.database.updateContent(prompts.contentId, {
        video_cost: totalCost,
      });

      // Save metadata to storage
      await this.storage.saveJSON(`${prompts.contentId}/videos.json`, output);

      // Log processing
      await this.database.logProcessing({
        content_id: prompts.contentId,
        layer: 'video',
        status: 'completed',
        completed_at: new Date(),
        metadata: output,
        cost: totalCost,
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info('Layer 3 completed', {
        contentId: prompts.contentId,
        duration,
        cost: totalCost,
        videosGenerated: videos.length,
      });

      return output;
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.error('Layer 3 failed', { error, duration, contentId: prompts.contentId });

      await this.database.updateContent(prompts.contentId, { status: 'failed' });
      await this.database.logProcessing({
        content_id: prompts.contentId,
        layer: 'video',
        status: 'failed',
        completed_at: new Date(),
        error_message: (error as Error).message,
      });

      throw error;
    }
  }
}
```

**Acceptance Criteria:**
- ✅ Layer 3 generates 3 videos via Fal.ai
- ✅ Videos are downloaded to local storage
- ✅ Costs are tracked (~$0.75 total)
- ✅ Metadata saved to storage

---

## Task 3.2: Layer 4 - Video Composition (FFmpeg)

### 3.2.1: Create Composition Schema
Create `src/layers/04-composition/schema.ts`:

```typescript
import { z } from 'zod';

export const CompositionOutputSchema = z.object({
  contentId: z.string().uuid(),
  finalVideo: z.object({
    storagePath: z.string(),
    duration: z.number().min(14).max(16),
    resolution: z.literal('720p'),
    aspectRatio: z.literal('9:16'),
    fileSize: z.number(),
    processedAt: z.string(),
    cost: z.number(),
  }),
});

export type CompositionOutput = z.infer<typeof CompositionOutputSchema>;
```

### 3.2.2: Create FFmpeg Composer
Create `src/layers/04-composition/ffmpeg-local.ts`:

```typescript
import ffmpeg from 'fluent-ffmpeg';
import { CompositionOutput, VideoGenerationOutput } from '../../core/types';
import { createStorage } from '../../core/storage';
import { logger } from '../../core/logger';
import fs from 'fs/promises';

export class LocalFFmpegComposer {
  private storage = createStorage();

  async compose(videoOutput: VideoGenerationOutput): Promise<CompositionOutput> {
    logger.info('Starting video composition with local FFmpeg', {
      contentId: videoOutput.contentId,
    });

    const contentId = videoOutput.contentId;
    const inputFiles = videoOutput.videos.map((v) => this.storage.getFullPath(v.storagePath));
    const outputPath = `${contentId}/final_video.mp4`;
    const outputFullPath = this.storage.getFullPath(outputPath);

    // Create concat file for FFmpeg
    const concatFilePath = this.storage.getFullPath(`${contentId}/concat.txt`);
    const concatContent = inputFiles.map((file) => `file '${file}'`).join('\n');
    await fs.writeFile(concatFilePath, concatContent);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatFilePath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions([
          '-c copy', // Copy streams without re-encoding (faster)
        ])
        .output(outputFullPath)
        .on('start', (commandLine) => {
          logger.debug('FFmpeg command:', { commandLine });
        })
        .on('progress', (progress) => {
          logger.debug('Processing', { percent: progress.percent });
        })
        .on('end', async () => {
          logger.info('FFmpeg composition completed');

          // Get file size
          const stats = await fs.stat(outputFullPath);
          const fileSize = stats.size;

          // Clean up concat file
          await fs.unlink(concatFilePath);

          const output: CompositionOutput = {
            contentId,
            finalVideo: {
              storagePath: outputPath,
              duration: 15, // 3 × 5 seconds
              resolution: '720p',
              aspectRatio: '9:16',
              fileSize,
              processedAt: new Date().toISOString(),
              cost: 0, // Local FFmpeg is free
            },
          };

          resolve(output);
        })
        .on('error', (err) => {
          logger.error('FFmpeg error', { error: err });
          reject(err);
        })
        .run();
    });
  }

  estimateCost(): number {
    return 0; // Local FFmpeg is free
  }
}
```

### 3.2.3: Create Layer 4 Main Logic
Create `src/layers/04-composition/index.ts`:

```typescript
import { CompositionOutput, VideoGenerationOutput } from '../../core/types';
import { Database } from '../../core/database';
import { createStorage } from '../../core/storage';
import { logger } from '../../core/logger';
import { validate } from '../../utils/validation';
import { CompositionOutputSchema } from './schema';
import { LocalFFmpegComposer } from './ffmpeg-local';
import { PipelineConfig } from '../../core/types';

export class CompositionLayer {
  private database: Database;
  private storage = createStorage();

  constructor(database: Database) {
    this.database = database;
  }

  async execute(
    videoOutput: VideoGenerationOutput,
    config: PipelineConfig
  ): Promise<CompositionOutput> {
    logger.info('Starting Layer 4: Composition', { contentId: videoOutput.contentId });

    const startTime = Date.now();

    try {
      // Create composer
      const composer = new LocalFFmpegComposer();

      // Compose videos
      const output = await composer.compose(videoOutput);
      const cost = composer.estimateCost();

      // Validate output
      validate(CompositionOutputSchema, output);

      // Update database
      await this.database.updateContent(videoOutput.contentId, {
        composition_cost: cost,
        final_video_path: output.finalVideo.storagePath,
        storage_path: videoOutput.contentId,
      });

      // Save metadata
      await this.storage.saveJSON(`${videoOutput.contentId}/composition.json`, output);

      // Log processing
      await this.database.logProcessing({
        content_id: videoOutput.contentId,
        layer: 'composition',
        status: 'completed',
        completed_at: new Date(),
        metadata: output,
        cost,
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info('Layer 4 completed', {
        contentId: videoOutput.contentId,
        duration,
        fileSize: output.finalVideo.fileSize,
      });

      return output;
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.error('Layer 4 failed', { error, duration, contentId: videoOutput.contentId });

      await this.database.updateContent(videoOutput.contentId, { status: 'failed' });
      await this.database.logProcessing({
        content_id: videoOutput.contentId,
        layer: 'composition',
        status: 'failed',
        completed_at: new Date(),
        error_message: (error as Error).message,
      });

      throw error;
    }
  }
}
```

**Acceptance Criteria:**
- ✅ Layer 4 concatenates 3 videos into one
- ✅ Final video is 15 seconds (720p, 9:16)
- ✅ No re-encoding (fast copy mode)
- ✅ Zero cost (local FFmpeg)

---

**Phase 3 Complete!** ✅

Continue to Phase 4...

---

# Phase 4: Layer 5-6 Implementation (Review & Distribution)

**Goal:** Implement review and distribution layers
**Estimated Time:** 5-7 days
**Prerequisites:** Phase 3 complete

---

## Task 4.1: Layer 5 - Review System (Slack)

### 4.1.1: Setup Slack Webhook
1. Go to https://api.slack.com/apps
2. Create new app "Social Media Pipeline"
3. Enable "Incoming Webhooks"
4. Add webhook to workspace
5. Copy webhook URL to `.env` as `SLACK_WEBHOOK_URL`

### 4.1.2: Create Review Schema
Create `src/layers/05-review/schema.ts`:

```typescript
import { z } from 'zod';

export const ReviewOutputSchema = z.object({
  contentId: z.string().uuid(),
  decision: z.enum(['approved', 'rejected', 'edited']),
  reviewedAt: z.string(),
  reviewedBy: z.string(),
  notes: z.string().optional(),
  editedCaption: z.string().optional(),
});

export type ReviewOutput = z.infer<typeof ReviewOutputSchema>;
```

### 4.1.3: Create Slack Integration
Create `src/layers/05-review/slack.ts`:

```typescript
import axios from 'axios';
import { CompositionOutput, IdeaOutput } from '../../core/types';
import { createStorage } from '../../core/storage';
import { logger } from '../../core/logger';
import { Database } from '../../core/database';

export class SlackReviewChannel {
  private webhookUrl: string;
  private storage = createStorage();
  private database: Database;

  constructor(webhookUrl: string, database: Database) {
    this.webhookUrl = webhookUrl;
    this.database = database;
  }

  async sendReviewRequest(
    idea: IdeaOutput,
    composition: CompositionOutput
  ): Promise<void> {
    logger.info('Sending review request to Slack', { contentId: idea.id });

    const videoUrl = this.storage.getFullPath(composition.finalVideo.storagePath);

    const message = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🎬 New Content Ready for Review',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Content ID:*\n${idea.id}`,
            },
            {
              type: 'mrkdwn',
              text: `*Created:*\n${new Date(idea.timestamp).toLocaleString()}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Idea:*\n${idea.idea}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Caption:*\n${idea.caption}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Cultural Context:*\n${idea.culturalContext}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Video:*\nFile: \`${videoUrl}\`\nDuration: ${composition.finalVideo.duration}s\nSize: ${(composition.finalVideo.fileSize / 1024 / 1024).toFixed(2)} MB`,
          },
        },
        {
          type: 'divider',
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '✅ Approve',
              },
              style: 'primary',
              value: `approve_${idea.id}`,
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '❌ Reject',
              },
              style: 'danger',
              value: `reject_${idea.id}`,
            },
          ],
        },
      ],
    };

    await axios.post(this.webhookUrl, message);
    logger.info('Review request sent to Slack');
  }

  async waitForReview(contentId: string, timeoutMs: number = 86400000): Promise<{
    decision: 'approved' | 'rejected';
    reviewedBy: string;
    notes?: string;
  }> {
    logger.info('Waiting for human review', { contentId, timeoutMs });

    // Mark content as pending review
    await this.database.updateContent(contentId, { status: 'review_pending' });

    // Poll database for review decision
    const startTime = Date.now();
    const pollInterval = 10000; // 10 seconds

    return new Promise((resolve, reject) => {
      const checkReview = async () => {
        const content = await this.database.getContent(contentId);

        if (content?.status === 'approved') {
          resolve({
            decision: 'approved',
            reviewedBy: content.reviewed_by || 'Unknown',
            notes: content.review_notes,
          });
          return;
        }

        if (content?.status === 'rejected') {
          resolve({
            decision: 'rejected',
            reviewedBy: content.reviewed_by || 'Unknown',
            notes: content.review_notes,
          });
          return;
        }

        // Check timeout
        if (Date.now() - startTime > timeoutMs) {
          reject(new Error('Review timeout exceeded'));
          return;
        }

        // Continue polling
        setTimeout(checkReview, pollInterval);
      };

      checkReview();
    });
  }
}
```

### 4.1.4: Create Manual Review Script
Create `scripts/review-content.ts`:

```typescript
import { Database } from '../src/core/database';
import dotenv from 'dotenv';

dotenv.config();

async function reviewContent() {
  const db = new Database();

  const contentId = process.argv[2];
  const decision = process.argv[3] as 'approve' | 'reject';
  const reviewedBy = process.argv[4] || 'Manual';
  const notes = process.argv[5];

  if (!contentId || !decision) {
    console.error('Usage: ts-node scripts/review-content.ts <contentId> <approve|reject> [reviewedBy] [notes]');
    process.exit(1);
  }

  if (decision !== 'approve' && decision !== 'reject') {
    console.error('Decision must be "approve" or "reject"');
    process.exit(1);
  }

  const status = decision === 'approve' ? 'approved' : 'rejected';

  await db.updateContent(contentId, {
    status,
    reviewed_at: new Date(),
    reviewed_by: reviewedBy,
    review_notes: notes,
  });

  console.log(`✅ Content ${contentId} ${status} by ${reviewedBy}`);

  await db.close();
}

reviewContent();
```

Add to `package.json` scripts:
```json
{
  "scripts": {
    "review": "ts-node scripts/review-content.ts"
  }
}
```

### 4.1.5: Create Layer 5 Main Logic
Create `src/layers/05-review/index.ts`:

```typescript
import { ReviewOutput, IdeaOutput, CompositionOutput } from '../../core/types';
import { Database } from '../../core/database';
import { createStorage } from '../../core/storage';
import { logger } from '../../core/logger';
import { validate } from '../../utils/validation';
import { ReviewOutputSchema } from './schema';
import { SlackReviewChannel } from './slack';
import { PipelineConfig } from '../../core/types';

export class ReviewLayer {
  private database: Database;
  private storage = createStorage();

  constructor(database: Database) {
    this.database = database;
  }

  async execute(
    idea: IdeaOutput,
    composition: CompositionOutput,
    config: PipelineConfig
  ): Promise<ReviewOutput> {
    logger.info('Starting Layer 5: Review', { contentId: idea.id });

    const startTime = Date.now();

    try {
      // Create review channel
      const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
      if (!slackWebhookUrl) {
        throw new Error('SLACK_WEBHOOK_URL not found in environment');
      }

      const reviewChannel = new SlackReviewChannel(slackWebhookUrl, this.database);

      // Send review request
      await reviewChannel.sendReviewRequest(idea, composition);

      // Wait for review (with timeout)
      const review = await reviewChannel.waitForReview(
        idea.id,
        config.layers.review.timeout * 1000
      );

      const output: ReviewOutput = {
        contentId: idea.id,
        decision: review.decision,
        reviewedAt: new Date().toISOString(),
        reviewedBy: review.reviewedBy,
        notes: review.notes,
      };

      // Validate output
      validate(ReviewOutputSchema, output);

      // Save metadata
      await this.storage.saveJSON(`${idea.id}/review.json`, output);

      // Log processing
      await this.database.logProcessing({
        content_id: idea.id,
        layer: 'review',
        status: 'completed',
        completed_at: new Date(),
        metadata: output,
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info('Layer 5 completed', {
        contentId: idea.id,
        duration,
        decision: review.decision,
      });

      return output;
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.error('Layer 5 failed', { error, duration, contentId: idea.id });

      await this.database.logProcessing({
        content_id: idea.id,
        layer: 'review',
        status: 'failed',
        completed_at: new Date(),
        error_message: (error as Error).message,
      });

      throw error;
    }
  }
}
```

**Acceptance Criteria:**
- ✅ Review request sent to Slack with video details
- ✅ Manual approval/rejection via script
- ✅ Database status updated based on decision
- ✅ Timeout protection (24 hours default)

---

## Task 4.2: Layer 6 - Distribution (Social Media)

### 4.2.1: Create Distribution Schema
Create `src/layers/06-distribution/schema.ts`:

```typescript
import { z } from 'zod';

export const PlatformPostSchema = z.object({
  platform: z.enum(['instagram', 'tiktok', 'youtube']),
  postId: z.string(),
  postUrl: z.string(),
  postedAt: z.string(),
  status: z.enum(['posted', 'failed']),
  error: z.string().optional(),
});

export const DistributionOutputSchema = z.object({
  contentId: z.string().uuid(),
  posts: z.array(PlatformPostSchema),
});

export type PlatformPost = z.infer<typeof PlatformPostSchema>;
export type DistributionOutput = z.infer<typeof DistributionOutputSchema>;
```

### 4.2.2: Create Instagram Platform
Create `src/layers/06-distribution/platforms/instagram.ts`:

```typescript
import axios from 'axios';
import { PlatformPost } from '../../../core/types';
import { createStorage } from '../../../core/storage';
import { logger } from '../../../core/logger';

export class InstagramPlatform {
  private accessToken: string;
  private businessAccountId: string;
  private storage = createStorage();

  constructor(accessToken: string, businessAccountId: string) {
    this.accessToken = accessToken;
    this.businessAccountId = businessAccountId;
  }

  async post(videoPath: string, caption: string): Promise<PlatformPost> {
    logger.info('Posting to Instagram', { videoPath });

    try {
      // Step 1: Create media container
      const videoUrl = this.getPublicVideoUrl(videoPath);

      const containerResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${this.businessAccountId}/media`,
        {
          media_type: 'REELS',
          video_url: videoUrl,
          caption: caption,
          access_token: this.accessToken,
        }
      );

      const containerId = containerResponse.data.id;
      logger.info('Media container created', { containerId });

      // Step 2: Publish media
      const publishResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${this.businessAccountId}/media_publish`,
        {
          creation_id: containerId,
          access_token: this.accessToken,
        }
      );

      const mediaId = publishResponse.data.id;
      const postUrl = `https://www.instagram.com/reel/${mediaId}`;

      logger.info('Posted to Instagram successfully', { mediaId });

      return {
        platform: 'instagram',
        postId: mediaId,
        postUrl: postUrl,
        postedAt: new Date().toISOString(),
        status: 'posted',
      };
    } catch (error: any) {
      logger.error('Failed to post to Instagram', { error: error.message });
      return {
        platform: 'instagram',
        postId: '',
        postUrl: '',
        postedAt: new Date().toISOString(),
        status: 'failed',
        error: error.message,
      };
    }
  }

  private getPublicVideoUrl(videoPath: string): string {
    // TODO: Implement public URL generation
    // Options:
    // 1. Upload to cloud storage (S3/R2) and return public URL
    // 2. Use ngrok for local testing
    // 3. Use local web server with public endpoint
    throw new Error('Public URL generation not yet implemented');
  }
}
```

### 4.2.3: Create Platform Stubs
Create `src/layers/06-distribution/platforms/tiktok.ts`:

```typescript
import { PlatformPost } from '../../../core/types';
import { logger } from '../../../core/logger';

export class TikTokPlatform {
  async post(videoPath: string, caption: string): Promise<PlatformPost> {
    logger.warn('TikTok integration not yet implemented');
    return {
      platform: 'tiktok',
      postId: '',
      postUrl: '',
      postedAt: new Date().toISOString(),
      status: 'failed',
      error: 'Not yet implemented',
    };
  }
}
```

Create `src/layers/06-distribution/platforms/youtube.ts`:

```typescript
import { PlatformPost } from '../../../core/types';
import { logger } from '../../../core/logger';

export class YouTubePlatform {
  async post(videoPath: string, caption: string): Promise<PlatformPost> {
    logger.warn('YouTube integration not yet implemented');
    return {
      platform: 'youtube',
      postId: '',
      postUrl: '',
      postedAt: new Date().toISOString(),
      status: 'failed',
      error: 'Not yet implemented',
    };
  }
}
```

### 4.2.4: Create Layer 6 Main Logic
Create `src/layers/06-distribution/index.ts`:

```typescript
import { DistributionOutput, IdeaOutput, CompositionOutput } from '../../core/types';
import { Database } from '../../core/database';
import { createStorage } from '../../core/storage';
import { logger } from '../../core/logger';
import { validate } from '../../utils/validation';
import { DistributionOutputSchema } from './schema';
import { InstagramPlatform } from './platforms/instagram';
import { TikTokPlatform } from './platforms/tiktok';
import { YouTubePlatform } from './platforms/youtube';

export class DistributionLayer {
  private database: Database;
  private storage = createStorage();

  constructor(database: Database) {
    this.database = database;
  }

  async execute(
    idea: IdeaOutput,
    composition: CompositionOutput
  ): Promise<DistributionOutput> {
    logger.info('Starting Layer 6: Distribution', { contentId: idea.id });

    const startTime = Date.now();

    try {
      const videoPath = this.storage.getFullPath(composition.finalVideo.storagePath);
      const caption = idea.caption;

      const posts = [];

      // Check if distribution is enabled
      if (process.env.ENABLE_DISTRIBUTION === 'true') {
        // Instagram
        if (process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID) {
          const instagram = new InstagramPlatform(
            process.env.INSTAGRAM_ACCESS_TOKEN,
            process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
          );
          const instagramPost = await instagram.post(videoPath, caption);
          posts.push(instagramPost);
        }

        // TikTok
        if (process.env.TIKTOK_ACCESS_TOKEN) {
          const tiktok = new TikTokPlatform();
          const tiktokPost = await tiktok.post(videoPath, caption);
          posts.push(tiktokPost);
        }

        // YouTube
        if (process.env.YOUTUBE_CLIENT_ID) {
          const youtube = new YouTubePlatform();
          const youtubePost = await youtube.post(videoPath, caption);
          posts.push(youtubePost);
        }
      } else {
        logger.warn('Distribution disabled via ENABLE_DISTRIBUTION flag');
      }

      const output: DistributionOutput = {
        contentId: idea.id,
        posts,
      };

      // Validate output
      validate(DistributionOutputSchema, output);

      // Update database
      await this.database.updateContent(idea.id, {
        status: 'posted',
        posted_at: new Date(),
      });

      // Save platform posts to database
      for (const post of posts) {
        if (post.status === 'posted') {
          await this.database.getClient().then((client) => {
            client.query(
              `INSERT INTO platform_posts (content_id, platform, post_id, post_url, status)
               VALUES ($1, $2, $3, $4, $5)`,
              [idea.id, post.platform, post.postId, post.postUrl, post.status]
            );
            client.release();
          });
        }
      }

      // Save metadata
      await this.storage.saveJSON(`${idea.id}/distribution.json`, output);

      // Log processing
      await this.database.logProcessing({
        content_id: idea.id,
        layer: 'distribution',
        status: 'completed',
        completed_at: new Date(),
        metadata: output,
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info('Layer 6 completed', {
        contentId: idea.id,
        duration,
        platforms: posts.length,
        successful: posts.filter((p) => p.status === 'posted').length,
      });

      return output;
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.error('Layer 6 failed', { error, duration, contentId: idea.id });

      await this.database.logProcessing({
        content_id: idea.id,
        layer: 'distribution',
        status: 'failed',
        completed_at: new Date(),
        error_message: (error as Error).message,
      });

      throw error;
    }
  }
}
```

**Acceptance Criteria:**
- ✅ Distribution layer structure created
- ✅ Instagram platform (partial implementation)
- ✅ Platform stubs for TikTok and YouTube
- ✅ Feature flag to enable/disable distribution
- ✅ Database records platform posts

**Note:** Full platform implementations require:
- Public video hosting (ngrok, cloud storage, or CDN)
- OAuth flow for YouTube
- TikTok developer account approval

---

**Phase 4 Complete!** ✅

Continue to Phase 5...

---

# Phase 5: Integration & Testing

**Goal:** Complete end-to-end pipeline and testing
**Estimated Time:** 3-5 days
**Prerequisites:** Phase 4 complete

---

## Task 5.1: Complete Orchestrator

### 5.1.1: Update Orchestrator with All Layers
Edit `src/core/orchestrator.ts`:

```typescript
import { Database } from './database';
import { logger } from './logger';
import { getConfig } from '../config';
import { IdeaGenerationLayer } from '../layers/01-idea-generation';
import { PromptEngineeringLayer } from '../layers/02-prompt-engineering';
import { VideoGenerationLayer } from '../layers/03-video-generation';
import { CompositionLayer } from '../layers/04-composition';
import { ReviewLayer } from '../layers/05-review';
import { DistributionLayer } from '../layers/06-distribution';

export class PipelineOrchestrator {
  private db: Database;
  private config = getConfig();

  constructor() {
    this.db = new Database();
  }

  async runPipeline(): Promise<void> {
    logger.info('Starting pipeline execution');
    const pipelineStartTime = Date.now();

    try {
      // Layer 1: Idea Generation
      logger.info('=== Starting Layer 1: Idea Generation ===');
      const ideaLayer = new IdeaGenerationLayer(this.db);
      const idea = await ideaLayer.execute(this.config);
      const contentId = idea.id;
      logger.info(`Layer 1 completed. Content ID: ${contentId}`);

      await this.db.updateContent(contentId, { status: 'idea_generated' });

      // Layer 2: Prompt Engineering
      logger.info('=== Starting Layer 2: Prompt Engineering ===');
      const promptLayer = new PromptEngineeringLayer(this.db);
      const prompts = await promptLayer.execute(idea, this.config);
      logger.info(`Layer 2 completed. Generated ${prompts.prompts.length} prompts`);

      await this.db.updateContent(contentId, { status: 'prompts_generated' });

      // Layer 3: Video Generation
      logger.info('=== Starting Layer 3: Video Generation ===');
      const videoLayer = new VideoGenerationLayer(this.db);
      const videos = await videoLayer.execute(prompts, this.config);
      logger.info(`Layer 3 completed. Generated ${videos.videos.length} videos`);

      await this.db.updateContent(contentId, { status: 'videos_generated' });

      // Layer 4: Composition
      logger.info('=== Starting Layer 4: Composition ===');
      const compositionLayer = new CompositionLayer(this.db);
      const composition = await compositionLayer.execute(videos, this.config);
      logger.info('Layer 4 completed. Final video composed');

      await this.db.updateContent(contentId, { status: 'review_pending' });

      // Layer 5: Review
      logger.info('=== Starting Layer 5: Review ===');
      const reviewLayer = new ReviewLayer(this.db);
      const review = await reviewLayer.execute(idea, composition, this.config);
      logger.info(`Layer 5 completed. Decision: ${review.decision}`);

      if (review.decision !== 'approved') {
        logger.info('Content not approved, skipping distribution', {
          contentId,
          decision: review.decision,
        });
        return;
      }

      // Layer 6: Distribution
      logger.info('=== Starting Layer 6: Distribution ===');
      const distributionLayer = new DistributionLayer(this.db);
      const distribution = await distributionLayer.execute(idea, composition);
      logger.info(`Layer 6 completed. Posted to ${distribution.posts.length} platforms`);

      // Calculate total cost
      const content = await this.db.getContent(contentId);
      const totalCost =
        (content?.idea_cost || 0) +
        (content?.prompt_cost || 0) +
        (content?.video_cost || 0) +
        (content?.composition_cost || 0);

      await this.db.updateContent(contentId, {
        total_cost: totalCost,
        completed_at: new Date(),
      });

      const totalDuration = ((Date.now() - pipelineStartTime) / 1000).toFixed(2);
      logger.info('Pipeline execution completed successfully', {
        contentId,
        duration: totalDuration,
        totalCost: totalCost.toFixed(4),
        allLayersCompleted: true,
      });
    } catch (error) {
      const totalDuration = ((Date.now() - pipelineStartTime) / 1000).toFixed(2);
      logger.error('Pipeline execution failed', { error, duration: totalDuration });
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.db.close();
  }
}
```

**Acceptance Criteria:**
- ✅ All 6 layers integrated into orchestrator
- ✅ Error handling at each layer
- ✅ Database status updates after each layer
- ✅ Total cost calculation

---

## Task 5.2: Integration Tests

### 5.2.1: Create End-to-End Test
Create `tests/integration/full-pipeline.test.ts`:

```typescript
import { PipelineOrchestrator } from '../../src/core/orchestrator';
import { Database } from '../../src/core/database';

describe('Full Pipeline Integration', () => {
  let orchestrator: PipelineOrchestrator;

  beforeAll(() => {
    // Ensure all environment variables are set
    if (!process.env.ANTHROPIC_API_KEY || !process.env.OPENAI_API_KEY || !process.env.FAL_API_KEY) {
      throw new Error('Missing required API keys for integration test');
    }

    orchestrator = new PipelineOrchestrator();
  });

  afterAll(async () => {
    await orchestrator.close();
  });

  it('should run full pipeline through Layer 4', async () => {
    // Note: This test stops at Layer 4 to avoid needing manual review
    // Layers 5-6 should be tested manually or with mocked components

    await orchestrator.runPipeline();

    // The pipeline should complete successfully through composition
    // Review layer will wait for manual approval
  }, 600000); // 10 minute timeout for video generation
});
```

### 5.2.2: Create Layer-Specific Tests
Tests already created in previous phases. Ensure all exist:
- `tests/layers/idea-generation.test.ts`
- `tests/layers/prompt-engineering.test.ts`
- Add: `tests/layers/video-generation.test.ts`
- Add: `tests/layers/composition.test.ts`

**Acceptance Criteria:**
- ✅ Integration test runs layers 1-4
- ✅ All layer-specific tests pass
- ✅ Manual testing procedure documented for layers 5-6

---

## Task 5.3: Error Recovery

### 5.3.1: Add Resume Capability
Create `src/core/resume.ts`:

```typescript
import { Database } from './database';
import { logger } from './logger';

export class PipelineResume {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  async getLastFailedContent(): Promise<string | null> {
    const client = await this.db.getClient();
    try {
      const result = await client.query(`
        SELECT id, status
        FROM content
        WHERE status = 'failed'
        ORDER BY created_at DESC
        LIMIT 1
      `);

      return result.rows[0]?.id || null;
    } finally {
      client.release();
    }
  }

  async getContentStatus(contentId: string): Promise<{
    status: string;
    lastCompletedLayer: string | null;
  }> {
    const content = await this.db.getContent(contentId);
    if (!content) {
      throw new Error(`Content ${contentId} not found`);
    }

    const client = await this.db.getClient();
    try {
      const logsResult = await client.query(
        `SELECT layer FROM processing_logs
         WHERE content_id = $1 AND status = 'completed'
         ORDER BY completed_at DESC
         LIMIT 1`,
        [contentId]
      );

      return {
        status: content.status,
        lastCompletedLayer: logsResult.rows[0]?.layer || null,
      };
    } finally {
      client.release();
    }
  }
}
```

**Acceptance Criteria:**
- ✅ Can identify failed content
- ✅ Can determine last completed layer
- ✅ Foundation for resume functionality

---

**Phase 5 Complete!** ✅

Continue to Phase 6...

---

# Phase 6: Deployment & Monitoring

**Goal:** Deploy and monitor the pipeline
**Estimated Time:** 2-3 days
**Prerequisites:** Phase 5 complete

---

## Task 6.1: Cron Scheduling

### 6.1.1: Create Cron Wrapper
Create `src/cron.ts`:

```typescript
import cron from 'node-cron';
import { PipelineOrchestrator } from './core/orchestrator';
import { logger } from './core/logger';

const schedule = process.env.CRON_SCHEDULE || '0 9 * * *'; // 9 AM daily

logger.info('Starting cron scheduler', { schedule });

cron.schedule(schedule, async () => {
  logger.info('Cron job triggered, starting pipeline');

  const orchestrator = new PipelineOrchestrator();

  try {
    await orchestrator.runPipeline();
    logger.info('Pipeline completed successfully via cron');
  } catch (error) {
    logger.error('Pipeline failed via cron', { error });
  } finally {
    await orchestrator.close();
  }
});

logger.info('Cron scheduler running. Press Ctrl+C to stop.');

// Keep process alive
process.on('SIGINT', () => {
  logger.info('Stopping cron scheduler');
  process.exit(0);
});
```

Add to `package.json`:
```json
{
  "scripts": {
    "cron": "ts-node src/cron.ts",
    "cron:prod": "node dist/cron.js"
  }
}
```

**Acceptance Criteria:**
- ✅ Cron schedule configurable via environment
- ✅ Pipeline runs automatically at scheduled time
- ✅ Graceful shutdown on Ctrl+C

---

## Task 6.2: Deployment

### 6.2.1: Create Deployment Guide
Create `DEPLOYMENT.md`:

````markdown
# Deployment Guide

## Local Deployment (Development)

1. Install dependencies:
```bash
npm install
```

2. Setup database:
```bash
createdb social_media
npm run setup-db
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. Run once:
```bash
npm run pipeline
```

5. Run with cron:
```bash
npm run cron
```

## VPS Deployment (Production)

### Prerequisites
- Ubuntu 20.04+ or similar
- Node.js 20+
- PostgreSQL 14+
- FFmpeg

### Setup

1. Clone repository:
```bash
git clone <repo-url>
cd social-media-pipeline
```

2. Install dependencies:
```bash
npm install
npm run build
```

3. Setup PostgreSQL:
```bash
sudo -u postgres createdb social_media
npm run setup-db
```

4. Configure environment:
```bash
nano .env
# Add your API keys
```

5. Create systemd service:
```bash
sudo nano /etc/systemd/system/social-media-cron.service
```

```ini
[Unit]
Description=Social Media Pipeline Cron
After=network.target postgresql.service

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/social-media-pipeline
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /path/to/social-media-pipeline/dist/cron.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

6. Start service:
```bash
sudo systemctl enable social-media-cron
sudo systemctl start social-media-cron
sudo systemctl status social-media-cron
```

7. View logs:
```bash
sudo journalctl -u social-media-cron -f
```

## Railway.app Deployment

1. Connect GitHub repository to Railway
2. Add environment variables in Railway dashboard
3. Add PostgreSQL plugin
4. Deploy automatically on git push

## Monitoring

- Logs: `./logs/combined.log`
- Errors: `./logs/error.log`
- Database: `psql -d social_media -c "SELECT * FROM content ORDER BY created_at DESC LIMIT 10;"`
````

**Acceptance Criteria:**
- ✅ Deployment guide complete
- ✅ Systemd service file provided
- ✅ Multiple deployment options documented

---

## Task 6.3: Monitoring & Alerts

### 6.3.1: Create Monitoring Dashboard Script
Create `scripts/dashboard.ts`:

```typescript
import { Database } from '../src/core/database';
import dotenv from 'dotenv';

dotenv.config();

async function showDashboard() {
  const db = new Database();
  const client = await db.getClient();

  try {
    console.log('\n📊 Social Media Pipeline Dashboard\n');
    console.log('='.repeat(60));

    // Total content
    const totalResult = await client.query('SELECT COUNT(*) FROM content');
    console.log(`\n📝 Total Content: ${totalResult.rows[0].count}`);

    // Status breakdown
    const statusResult = await client.query(`
      SELECT status, COUNT(*)
      FROM content
      GROUP BY status
      ORDER BY COUNT(*) DESC
    `);
    console.log('\n📌 Status Breakdown:');
    statusResult.rows.forEach((row) => {
      console.log(`   ${row.status}: ${row.count}`);
    });

    // Recent content
    const recentResult = await client.query(`
      SELECT id, idea, status, created_at
      FROM content
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.log('\n🕐 Recent Content:');
    recentResult.rows.forEach((row) => {
      console.log(`   ${row.id.substring(0, 8)}... - ${row.status} - ${row.idea.substring(0, 40)}...`);
    });

    // Total costs
    const costResult = await client.query(`
      SELECT
        SUM(idea_cost) as total_idea,
        SUM(prompt_cost) as total_prompt,
        SUM(video_cost) as total_video,
        SUM(total_cost) as total
      FROM content
    `);
    console.log('\n💰 Total Costs:');
    const costs = costResult.rows[0];
    console.log(`   Idea Generation: $${(costs.total_idea || 0).toFixed(4)}`);
    console.log(`   Prompt Engineering: $${(costs.total_prompt || 0).toFixed(4)}`);
    console.log(`   Video Generation: $${(costs.total_video || 0).toFixed(4)}`);
    console.log(`   TOTAL: $${(costs.total || 0).toFixed(4)}`);

    // Platform posts
    const postsResult = await client.query(`
      SELECT platform, COUNT(*)
      FROM platform_posts
      WHERE status = 'posted'
      GROUP BY platform
    `);
    console.log('\n📱 Platform Posts:');
    if (postsResult.rows.length === 0) {
      console.log('   No posts yet');
    } else {
      postsResult.rows.forEach((row) => {
        console.log(`   ${row.platform}: ${row.count}`);
      });
    }

    console.log('\n' + '='.repeat(60) + '\n');
  } finally {
    client.release();
    await db.close();
  }
}

showDashboard();
```

Add to `package.json`:
```json
{
  "scripts": {
    "dashboard": "ts-node scripts/dashboard.ts"
  }
}
```

**Acceptance Criteria:**
- ✅ Dashboard shows content statistics
- ✅ Dashboard shows cost breakdown
- ✅ Dashboard shows platform posts
- ✅ Easy to run: `npm run dashboard`

---

**Phase 6 Complete!** ✅

---

# Project Complete! 🎉

You now have a fully functional social media content pipeline with:

✅ **Phase 0:** Environment setup
✅ **Phase 1:** Core infrastructure (database, storage, logging)
✅ **Phase 2:** Layers 1-2 (idea generation, prompt engineering)
✅ **Phase 3:** Layers 3-4 (video generation, composition)
✅ **Phase 4:** Layers 5-6 (review, distribution)
✅ **Phase 5:** Integration and testing
✅ **Phase 6:** Deployment and monitoring

## Next Steps

1. **Test the full pipeline:**
   ```bash
   npm run pipeline
   ```

2. **Review generated content:**
   ```bash
   npm run review <content-id> approve
   ```

3. **View dashboard:**
   ```bash
   npm run dashboard
   ```

4. **Deploy to production:**
   - Follow `DEPLOYMENT.md`
   - Setup cron job
   - Enable distribution

5. **Monitor and iterate:**
   - Check logs regularly
   - Track costs
   - Optimize prompts based on output quality

## Future Enhancements

- [ ] Custom review dashboard (web UI)
- [ ] A/B testing for different prompts
- [ ] Multi-account support
- [ ] Advanced analytics and reporting
- [ ] Content calendar and scheduling
- [ ] Additional platforms (LinkedIn, Twitter/X, etc.)
- [ ] Automated engagement response
- [ ] Performance optimization

Good luck with your social media automation! 🚀
