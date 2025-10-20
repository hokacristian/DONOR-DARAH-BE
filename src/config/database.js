const { PrismaClient } = require('@prisma/client');
const { encryptDonorData, decryptDonorData } = require('../utils/encryption');

const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Extend Prisma Client with encryption/decryption for Donor model
const prisma = basePrisma.$extends({
  name: 'donorEncryption',
  query: {
    donor: {
      // Encrypt before create
      async create({ args, query }) {
        if (args.data) {
          args.data = encryptDonorData(args.data);
        }
        const result = await query(args);
        return result ? decryptDonorData(result) : result;
      },

      // Encrypt before update
      async update({ args, query }) {
        if (args.data) {
          args.data = encryptDonorData(args.data);
        }
        const result = await query(args);
        return result ? decryptDonorData(result) : result;
      },

      // Encrypt before updateMany
      async updateMany({ args, query }) {
        if (args.data) {
          args.data = encryptDonorData(args.data);
        }
        return query(args);
      },

      // Decrypt after findUnique
      async findUnique({ args, query }) {
        const result = await query(args);
        return result ? decryptDonorData(result) : result;
      },

      // Decrypt after findFirst
      async findFirst({ args, query }) {
        const result = await query(args);
        return result ? decryptDonorData(result) : result;
      },

      // Decrypt after findMany
      async findMany({ args, query }) {
        const result = await query(args);
        return Array.isArray(result) ? result.map(donor => decryptDonorData(donor)) : result;
      },

      // Upsert handling
      async upsert({ args, query }) {
        if (args.create) {
          args.create = encryptDonorData(args.create);
        }
        if (args.update) {
          args.update = encryptDonorData(args.update);
        }
        const result = await query(args);
        return result ? decryptDonorData(result) : result;
      },
    },
  },
});

module.exports = prisma;
