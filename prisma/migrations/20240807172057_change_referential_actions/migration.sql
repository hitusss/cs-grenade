-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Destination" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "mapName" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "x" TEXT NOT NULL,
    "y" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Destination_mapName_fkey" FOREIGN KEY ("mapName") REFERENCES "Map" ("name") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Destination_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Destination" ("createdAt", "id", "mapName", "name", "team", "type", "updatedAt", "userId", "verified", "x", "y") SELECT "createdAt", "id", "mapName", "name", "team", "type", "updatedAt", "userId", "verified", "x", "y" FROM "Destination";
DROP TABLE "Destination";
ALTER TABLE "new_Destination" RENAME TO "Destination";
CREATE UNIQUE INDEX "Destination_mapName_team_type_x_y_key" ON "Destination"("mapName", "team", "type", "x", "y");
CREATE TABLE "new_DestinationChanges" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "x" TEXT NOT NULL,
    "y" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DestinationChanges_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DestinationChanges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DestinationChanges" ("createdAt", "destinationId", "id", "name", "updatedAt", "userId", "x", "y") SELECT "createdAt", "destinationId", "id", "name", "updatedAt", "userId", "x", "y" FROM "DestinationChanges";
DROP TABLE "DestinationChanges";
ALTER TABLE "new_DestinationChanges" RENAME TO "DestinationChanges";
CREATE UNIQUE INDEX "DestinationChanges_destinationId_key" ON "DestinationChanges"("destinationId");
CREATE TABLE "new_Grenade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "mapName" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "x" TEXT NOT NULL,
    "y" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Grenade_mapName_fkey" FOREIGN KEY ("mapName") REFERENCES "Map" ("name") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Grenade_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Grenade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Grenade" ("createdAt", "description", "destinationId", "id", "mapName", "name", "team", "type", "updatedAt", "userId", "verified", "x", "y") SELECT "createdAt", "description", "destinationId", "id", "mapName", "name", "team", "type", "updatedAt", "userId", "verified", "x", "y" FROM "Grenade";
DROP TABLE "Grenade";
ALTER TABLE "new_Grenade" RENAME TO "Grenade";
CREATE UNIQUE INDEX "Grenade_mapName_team_type_destinationId_x_y_key" ON "Grenade"("mapName", "team", "type", "destinationId", "x", "y");
CREATE TABLE "new_GrenadeChanges" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "x" TEXT NOT NULL,
    "y" TEXT NOT NULL,
    "grenadeId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GrenadeChanges_grenadeId_fkey" FOREIGN KEY ("grenadeId") REFERENCES "Grenade" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GrenadeChanges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GrenadeChanges" ("createdAt", "description", "grenadeId", "id", "name", "updatedAt", "userId", "x", "y") SELECT "createdAt", "description", "grenadeId", "id", "name", "updatedAt", "userId", "x", "y" FROM "GrenadeChanges";
DROP TABLE "GrenadeChanges";
ALTER TABLE "new_GrenadeChanges" RENAME TO "GrenadeChanges";
CREATE UNIQUE INDEX "GrenadeChanges_grenadeId_key" ON "GrenadeChanges"("grenadeId");
CREATE TABLE "new_Map" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Map_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Map" ("createdAt", "isActive", "label", "name", "updatedAt", "userId") SELECT "createdAt", "isActive", "label", "name", "updatedAt", "userId" FROM "Map";
DROP TABLE "Map";
ALTER TABLE "new_Map" RENAME TO "Map";
CREATE TABLE "new_Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "redirectTo" TEXT,
    "seen" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Notification" ("createdAt", "description", "id", "redirectTo", "seen", "title", "updatedAt", "userId") SELECT "createdAt", "description", "id", "redirectTo", "seen", "title", "updatedAt", "userId" FROM "Notification";
DROP TABLE "Notification";
ALTER TABLE "new_Notification" RENAME TO "Notification";
CREATE TABLE "new_Ticket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "open" BOOLEAN NOT NULL DEFAULT true,
    "title" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Ticket" ("createdAt", "id", "open", "title", "updatedAt", "userId") SELECT "createdAt", "id", "open", "title", "updatedAt", "userId" FROM "Ticket";
DROP TABLE "Ticket";
ALTER TABLE "new_Ticket" RENAME TO "Ticket";
CREATE TABLE "new_TicketMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "message" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "seen" BOOLEAN NOT NULL DEFAULT false,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TicketMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TicketMessage" ("createdAt", "id", "isAdmin", "message", "seen", "ticketId", "updatedAt", "userId") SELECT "createdAt", "id", "isAdmin", "message", "seen", "ticketId", "updatedAt", "userId" FROM "TicketMessage";
DROP TABLE "TicketMessage";
ALTER TABLE "new_TicketMessage" RENAME TO "TicketMessage";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
