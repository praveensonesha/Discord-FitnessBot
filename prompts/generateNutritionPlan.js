const mysql = require('mysql2/promise');
const dbConfig = require('../dbConfig');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { generateICS } = require('../events/generateICS');

const fitnessCoachPool = mysql.createPool(dbConfig.fitness_coach);
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function sendInChunks(channel, content) {
    const chunkSize = 2000; // Discord's maximum character limit
    for (let i = 0; i < content.length; i += chunkSize) {
        await channel.send(content.substring(i, i + chunkSize));
    }
}

async function generateNutritionPlan(user, client) {
    try {
        const userId = user.user_id;
        const discordUser = await client.users.fetch(userId);
        let dmChannel = discordUser.dmChannel;
        
        if (!dmChannel) {
            dmChannel = await discordUser.createDM();
        }

        const prompt = `
        Generate a personalized nutrition plan for a user with the following details:
        - Full Name: ${user.full_name}
        - Age: ${user.age}
        - Height: ${user.height}
        - Weight: ${user.weight}
        - Goals: ${JSON.stringify(user.goal)}
        - Daily Routine: ${user.daily_routine}
        - Allergies: ${JSON.stringify(user.allergies)}
        - Diet Preferences: ${JSON.stringify(user.diet_preferences)}
        - Exercise Preferences: ${JSON.stringify(user.exercise_preferences)}

        The nutrition plan should be tailored to their goals and include a detailed meal plan with recommended foods, quantities, and nutritional information. Consider any dietary preferences or restrictions.
        `;

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent([prompt]);
        const content = result.response.text();

        await sendInChunks(dmChannel, content); // Send in chunks

            // Generate ICS file
            const fileName = await generateICS('workout', user, content);
            if (fileName) {
                await dmChannel.send({ files: [fileName] });
            } else {
                await dmChannel.send("Failed to generate ICS file.");
            }
    } catch (error) {
        console.error(`Error sending nutrition plan to ${user.full_name}:`, error);
    }
}

module.exports = generateNutritionPlan;
