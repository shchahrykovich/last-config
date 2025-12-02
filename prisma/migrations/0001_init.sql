-- CreateTable
CREATE TABLE "Tenants" (
                           "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                           "isActive" BOOLEAN NOT NULL DEFAULT true,
                           "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Projects" (
                            "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                            "name" TEXT NOT NULL,
                            "tenantId" INTEGER NOT NULL,
                            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ApiKeys" (
                           "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                           "tenantId" INTEGER NOT NULL,
                           "projectId" INTEGER NOT NULL,
                           "public" TEXT NOT NULL,
                           "private" TEXT NOT NULL DEFAULT '',
                           "type" TEXT NOT NULL,
                           "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           "updatedAt" DATETIME NOT NULL,
                           "isPublic" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Prompts" (
                           "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                           "name" TEXT NOT NULL,
                           "body" TEXT NOT NULL,
                           "projectId" INTEGER NOT NULL,
                           "tenantId" INTEGER NOT NULL,
                           "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FeatureFlags" (
                                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                                "name" TEXT NOT NULL,
                                "description" TEXT NOT NULL DEFAULT '',
                                "value" TEXT NOT NULL DEFAULT '',
                                "type" TEXT NOT NULL DEFAULT 'string',
                                "userId" TEXT NOT NULL DEFAULT '',
                                "userRole" TEXT NOT NULL DEFAULT '',
                                "userAccountId" TEXT NOT NULL DEFAULT '',
                                "projectId" INTEGER NOT NULL,
                                "tenantId" INTEGER NOT NULL,
                                "isPublic" BOOLEAN NOT NULL DEFAULT false,
                                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PromptVersions" (
                                  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                                  "order" INTEGER NOT NULL,
                                  "name" TEXT NOT NULL,
                                  "body" TEXT NOT NULL,
                                  "promptId" INTEGER NOT NULL,
                                  "projectId" INTEGER NOT NULL,
                                  "tenantId" INTEGER NOT NULL,
                                  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                  "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "accounts" (
                            "id" TEXT NOT NULL PRIMARY KEY,
                            "user_id" TEXT NOT NULL,
                            "type" TEXT NOT NULL,
                            "provider" TEXT NOT NULL,
                            "provider_account_id" TEXT NOT NULL,
                            "refresh_token" TEXT,
                            "access_token" TEXT,
                            "expires_at" INTEGER,
                            "token_type" TEXT,
                            "scope" TEXT,
                            "id_token" TEXT,
                            "session_state" TEXT,
                            CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sessions" (
                            "id" TEXT NOT NULL PRIMARY KEY,
                            "session_token" TEXT NOT NULL,
                            "user_id" TEXT NOT NULL,
                            "expires" DATETIME NOT NULL,
                            CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "users" (
                         "id" TEXT NOT NULL PRIMARY KEY,
                         "tenant_id" INTEGER NOT NULL,
                         "name" TEXT,
                         "email" TEXT NOT NULL,
                         "email_verified" DATETIME,
                         "password" TEXT NOT NULL,
                         "image" TEXT
);

-- CreateTable
CREATE TABLE "verification_tokens" (
                                       "identifier" TEXT NOT NULL,
                                       "token" TEXT NOT NULL,
                                       "expires" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Projects_tenantId_idx" ON "Projects"("tenantId");

-- CreateIndex
CREATE INDEX "ApiKeys_public_idx" ON "ApiKeys"("public");

-- CreateIndex
CREATE INDEX "ApiKeys_tenantId_projectId_idx" ON "ApiKeys"("tenantId", "projectId");

-- CreateIndex
CREATE INDEX "Prompts_tenantId_projectId_idx" ON "Prompts"("tenantId", "projectId");

-- CreateIndex
CREATE INDEX "FeatureFlags_tenantId_projectId_idx" ON "FeatureFlags"("tenantId", "projectId");

-- CreateIndex
CREATE INDEX "FeatureFlags_tenantId_projectId_userId_userRole_userAccountId_idx" ON "FeatureFlags"("tenantId", "projectId", "userId", "userRole", "userAccountId");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

