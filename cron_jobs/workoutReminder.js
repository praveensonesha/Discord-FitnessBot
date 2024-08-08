const cron = require('node-cron');
const mysql = require('mysql2/promise');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'fitness_coach',
};

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function getUsersWithoutWorkout() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [rows] = await connection.execute(`
      SELECT DISTINCT user_id
      FROM chats
      WHERE user_id NOT IN (
        SELECT DISTINCT user_id
        FROM chats
        WHERE is_log = 1
          AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
      )
      AND user_id NOT IN (
        SELECT DISTINCT user_id
        FROM chats
        WHERE message = 'UNREACHABLE_USER'
          AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
      )
    `);
    return rows.map(row => row.user_id);
  } finally {
    await connection.end();
  }
}

async function getUserHistory(userId) {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [rows] = await connection.execute(`
      SELECT message
      FROM chats
      WHERE user_id = ? AND is_log = 1 AND message != 'UNREACHABLE_USER'
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId]);
    return rows.map(row => row.message).join(' ');
  } finally {
    await connection.end();
  }
}

async function generateMotivationMessage(userHistory) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  const prompt = `Based on this user's fitness history: "${userHistory}", generate a personalized, motivational reminder (about 50 words) to encourage them to work out. Include a specific suggestion based on their history. The message should be friendly and encouraging.`;
  
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Error generating motivation message:', error);
    return "Hey there! 💪 Time for a quick workout! Every session counts towards your goals. Let's keep that momentum going!";
  }
}

// async function markUserAsUnreachable(userId) {
//   const connection = await mysql.createConnection(dbConfig);
//   try {
//     await connection.execute(
//       'INSERT INTO chats (user_id, message, is_log) VALUES (?, ?, ?)',
//       [userId, 'UNREACHABLE_USER', 0]
//     );
//   } finally {
//     await connection.end();
//   }
// }

async function sendReminder(client, userId) {
  try {
    const user = await client.users.fetch(userId);
    const userHistory = await getUserHistory(userId);
    const motivationMessage = await generateMotivationMessage(userHistory);
    await user.send(motivationMessage);
    console.log(`Reminder sent successfully to user ${userId}`);
  } catch (error) {
    if (error.code === 50007) {
      console.log(`Unable to send DM to user ${userId}. They may have DMs disabled or have blocked the bot.`);
      // await markUserAsUnreachable(userId);
    } else {
      console.error(`Failed to send reminder to user ${userId}:`, error);
    }
  }
}

function workoutReminder(client) {
  // Schedule the cron job to run every day at 9 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('Running workout reminder cron job');
    try {
      const usersWithoutWorkout = await getUsersWithoutWorkout();
      for (let i = 0; i < usersWithoutWorkout.length; i++) {
        const userId = usersWithoutWorkout[i];
        setTimeout(() => {
          sendReminder(client, userId);
        }, i * 1000); // Delay of i * 1000 milliseconds (1 second) for each user
      }
    } catch (error) {
      console.error('Error in workout reminder cron job:', error);
    }
  });
}


module.exports = workoutReminder;