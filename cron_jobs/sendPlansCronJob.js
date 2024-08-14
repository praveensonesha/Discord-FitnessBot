const cron = require('node-cron');
const { Client } = require('discord.js');
const mysql = require('mysql2/promise');
const generateWorkoutPlan = require('../prompts/generateWorkoutPlan');
const generateNutritionPlan = require('../prompts/generateNutritionPlan');
const dbConfig = require('../dbConfig');

// Create connection pools
const fitnessCoachPool = mysql.createPool(dbConfig.fitness_coach);
const cubeClubPool = mysql.createPool(dbConfig.cube_club);

const sendWeeklyPlans = async (client) => {
  try {
    console.log('Sending weekly plans...');
    
    // Fetch subscribed users
    const [subscribedUsers] = await fitnessCoachPool.query(`
      SELECT * FROM users 
      WHERE is_workout_plan_subscribe = 1 OR is_nutrition_plan_subscribe = 1
    `);

    for (const user of subscribedUsers) {
      try {
        const discordUser = await client.users.fetch(user.user_id);

        if (user.is_workout_plan_subscribe) {
          console.log(`Generating workout plan for ${user.full_name}`);
          await generateWorkoutPlan(user, client);  // Pass client for sending DM
        }

        if (user.is_nutrition_plan_subscribe) {
          console.log(`Generating nutrition plan for ${user.full_name}`);
          await generateNutritionPlan(user, client);  // Pass client for sending DM
        }
      } catch (error) {
        console.error(`Error handling user ${user.user_id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error sending weekly plans:', error);
  }
};

// function scheduleWeeklyPlans(client) {
//   // Schedule the cron job to run every Monday at 9 AM
//   cron.schedule('0 9 * * 1', async () => {
//     console.log('Running weekly plans cron job');
//     await sendWeeklyPlans(client);
//   });
// }

function scheduleWeeklyPlans(client) {
    // Schedule the cron job to run every 5 minutes for testing
    cron.schedule('*/5 * * * *', async () => {
      console.log('Running weekly plans cron job (testing every 5 minutes)');
      await sendWeeklyPlans(client);
    });
  }

module.exports = scheduleWeeklyPlans;
