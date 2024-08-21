const cron = require('node-cron');
const mysql = require('mysql2/promise');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dbConfig = require('../dbConfig');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function getUsersWithoutWorkout() {
  const connection = await mysql.createConnection(dbConfig.fitness_coach);
  try {
    const [rows] = await connection.execute(`
      SELECT p.user_id
      FROM profile p
      LEFT JOIN chats c ON p.user_id = c.user_id AND c.is_log = 1 AND c.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
      WHERE c.user_id IS NULL AND p.user_id NOT IN (
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

async function getUserScores(userId) {
  const connection = await mysql.createConnection(dbConfig.fitness_coach);
  try {
    const [rows] = await connection.execute(`
      SELECT momentum_score, current_streak, max_streak
      FROM users
      WHERE user_id = ?
    `, [userId]);
    return rows[0];
  } finally {
    await connection.end();
  }
}

async function getUserHistory(userId) {
  const connection = await mysql.createConnection(dbConfig.fitness_coach);
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

async function generateMotivationMessage(userHistory, userScores) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  const { momentum_score, current_streak, max_streak } = userScores;
  const prompt = `Based on this user's fitness history: "${userHistory}", and their scores (momentum: ${momentum_score}, current streak: ${current_streak}, max streak: ${max_streak}), generate a personalized, motivational reminder (about 50 words) to encourage them to work out. Include a specific suggestion based on their history and scores. The message should be friendly and encouraging.`;
  
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Error generating motivation message:', error);
    return `Hey there! 💪 Your current momentum score is ${momentum_score}, your current streak is ${current_streak}, and your max streak is ${max_streak}. Keep pushing towards your goals! Every session counts. Let's stay motivated and keep up the great work!`;
  }
}

async function sendReminder(client, userId) {
  try {
    const user = await client.users.fetch(userId);
    const userHistory = await getUserHistory(userId);
    const userScores = await getUserScores(userId);
    const motivationMessage = await generateMotivationMessage(userHistory, userScores);
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
  cron.schedule('*/25 * * * *', async () => {
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
