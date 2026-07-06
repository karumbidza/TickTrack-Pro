#!/usr/bin/env node
/**
 * Script to clean all ticket-related data from the database
 * Run with: node scripts/clean-ticket-data.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanTicketData() {
  // Safety guard: destroys all ticket-related data. Never run against production.
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DB_RESET !== 'yes') {
    console.error('Refusing to run clean-ticket-data.');
    console.error('Requires NODE_ENV !== production AND ALLOW_DB_RESET=yes.');
    console.error('Target DB:', (process.env.DATABASE_URL || '(unset)').replace(/:\/\/[^@]*@/, '://***@'));
    process.exit(1);
  }

  console.log('🧹 Starting ticket data cleanup...\n');

  try {
    // Delete in order of dependencies (child tables first)
    
    // 1. Messages (related to tickets)
    const messages = await prisma.message.deleteMany({});
    console.log(`✅ Deleted ${messages.count} messages`);
    
    // 2. Ratings (related to tickets)
    const ratings = await prisma.rating.deleteMany({});
    console.log(`✅ Deleted ${ratings.count} ratings`);
    
    // 3. Quote Requests (related to tickets)
    const quoteRequests = await prisma.quoteRequest.deleteMany({});
    console.log(`✅ Deleted ${quoteRequests.count} quote requests`);
    
    // 4. Invoices (related to tickets)
    const invoices = await prisma.invoice.deleteMany({});
    console.log(`✅ Deleted ${invoices.count} invoices`);
    
    // 5. Notifications (related to tickets)
    const notifications = await prisma.notification.deleteMany({});
    console.log(`✅ Deleted ${notifications.count} notifications`);
    
    // 6. Finally, delete all tickets
    const tickets = await prisma.ticket.deleteMany({});
    console.log(`✅ Deleted ${tickets.count} tickets`);
    
    console.log('\n🎉 All ticket data cleaned successfully!');
    console.log('\nDatabase is ready for fresh data.');
    
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanTicketData();
