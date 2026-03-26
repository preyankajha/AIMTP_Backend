const cron = require('node-cron');
const User = require('../models/User');
const TransferRequest = require('../models/TransferRequest');
const sendEmail = require('./email');

/**
 * Daily Reminder Job for Registered but Unposted Users
 * Schedule: Every day at 9:30 AM IST (assuming server time is UTC or as per node-cron setup)
 * Logic: 
 * 1. Find users created between 24 and 120 hours ago (1-5 days).
 * 2. Check if they have ANY transfer requests posted.
 * 3. If zero requests, send a professional reminder email.
 */
const setupCronJobs = () => {
  // schedule(minute hour day month dayOfWeek)
  // '30 9 * * *' runs at 9:30 AM every day
  cron.schedule('30 9 * * *', async () => {
    console.log('[CRON] Starting daily reminder sweep for unposted users...');
    
    try {
      const now = new Date();
      const fiveDaysAgo = new Date(now.getTime() - (5 * 24 * 60 * 60 * 1000));
      const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

      // Find users who registered between 1 and 5 days ago
      const users = await User.find({
        createdAt: { $gte: fiveDaysAgo, $lte: oneDayAgo },
        role: 'employee' // Don't remind admins
      });

      let emailsSent = 0;

      for (const user of users) {
        // Check if they have any transfer requests
        const requestCount = await TransferRequest.countDocuments({ userId: user._id });
        
        if (requestCount === 0) {
          await sendReminder(user);
          emailsSent++;
        }
      }

      console.log(`[CRON] Sweep complete. Sent ${emailsSent} reminder(s).`);
    } catch (err) {
      console.error('[CRON] Reminder job failed:', err);
    }
  });
};

const sendReminder = async (user) => {
  const dayCount = Math.floor((new Date() - new Date(user.createdAt)) / (24 * 60 * 60 * 1000));
  const firstName = user.name.split(' ')[0];

  try {
    await sendEmail({
      email: user.email,
      subject: 'Reminder: Activate Your Transfer Request on AIMTP',
      html: `
        <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc;">
          <div style="background-color: #ffffff; padding: 40px; border-radius: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
            <div style="text-align: center; margin-bottom: 25px;">
              <span style="color: #3b82f6; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em;">Professional Reminder</span>
            </div>
            
            <h2 style="color: #1e293b; margin: 0 0 20px; font-size: 24px; font-weight: 800;">Hello, ${firstName}!</h2>
            <p style="color: #475569; margin: 0 0 24px; font-size: 16px; line-height: 1.6;">We noticed it's been ${dayCount} days since you joined the All India Mutual Transfer Portal, but you haven't posted your transfer request yet.</p>
            
            <div style="background-color: #f1f5f9; padding: 25px; border-radius: 16px; margin-bottom: 30px;">
              <p style="color: #1e293b; margin: 0 0 10px; font-size: 15px; font-weight: 700;">Why act now?</p>
              <p style="color: #475569; margin: 0; font-size: 14px; line-height: 1.6;">Every day, hundreds of new railway professionals join our portal. By posting your request now, you increase your chances of finding a matching partner who is looking for your exact current posting.</p>
            </div>
            
            <div style="text-align: center;">
              <a href="https://aimtp.in/transfers/create" style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 15px;">Post My Transfer Request</a>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">If you have already found a transfer or wish to unsubscribe, please update your profile settings.</p>
          </div>
        </div>
      `,
      message: `Hi ${firstName}, it's been ${dayCount} days since you joined AIMTP. Don't forget to post your transfer request at https://aimtp.in/transfers/create to start finding matches!`
    });
  } catch (err) {
    console.error(`[CRON] Failed to send reminder to ${user.email}:`, err);
  }
};

module.exports = setupCronJobs;
