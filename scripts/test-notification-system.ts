import { db } from '../db';
import { notifications } from '../db/schema/notifications';
import { users } from '../db/schema/auth';
import { eq } from 'drizzle-orm';

async function testNotificationSystem() {
  console.log('🔔 Testing Notification System\n');

  // Get first user
  const user = await db.query.users.findFirst({
    where: eq(users.isActive, true),
  });

  if (!user) {
    console.log('❌ No active users found. Please create a user first.');
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.name} (ID: ${user.id})`);

  // Create test notifications
  console.log('\n📝 Creating test notifications...');

  const testNotifications = [
    {
      userId: user.id,
      type: 'BILL_PENDING_APPROVAL' as const,
      title: 'Bill Requires Approval',
      message: 'Bill #12345 from Test Vendor exceeds approval threshold (500,000 UZS)',
      actionUrl: '/purchasing/bills/12345',
      actionLabel: 'Review Bill',
      entityType: 'bill',
      entityId: '12345',
      isRead: false,
    },
    {
      userId: user.id,
      type: 'INVENTORY_LOW_STOCK' as const,
      title: 'Low Stock Alert',
      message: 'Milk is below reorder point (5 kg remaining)',
      actionUrl: '/inventory/items/1',
      actionLabel: 'View Item',
      entityType: 'item',
      entityId: '1',
      isRead: false,
    },
    {
      userId: user.id,
      type: 'PRODUCTION_RUN_COMPLETED' as const,
      title: 'Production Completed',
      message: 'Yogurt production batch #789 completed successfully',
      actionUrl: '/production/789',
      actionLabel: 'View Details',
      entityType: 'production_run',
      entityId: '789',
      isRead: false,
    },
  ];

  for (const notif of testNotifications) {
    await db.insert(notifications).values(notif);
    console.log(`  ✅ Created: ${notif.title}`);
  }

  // Query notifications back
  console.log('\n📋 Retrieving notifications...');
  const allNotifications = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id));

  console.log(`\n✅ Found ${allNotifications.length} notifications for ${user.name}:\n`);

  allNotifications.forEach((notif, index) => {
    console.log(`${index + 1}. [${notif.type}] ${notif.title}`);
    console.log(`   ${notif.message}`);
    console.log(`   Read: ${notif.isRead ? 'Yes' : 'No'}`);
    console.log(`   Action: ${notif.actionLabel || 'None'}\n`);
  });

  // Test unread count
  const unreadCount = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .where(eq(notifications.isRead, false));

  console.log(`📊 Unread notifications: ${unreadCount.length}`);

  console.log('\n✅ Notification system test complete!');
  console.log('\n🌐 Now visit the app in your browser to see the bell icon with badge!');
}

testNotificationSystem().catch(console.error);
