// ============================================================
// STEP 3 - Client Prisma condiviso
// ------------------------------------------------------------
// Esportiamo una singola istanza di PrismaClient: crearla una
// volta sola evita di aprire più pool di connessioni al DB.
// ============================================================

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = prisma;
