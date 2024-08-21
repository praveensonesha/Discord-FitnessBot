const mysql = require('mysql2/promise');
const dbConfig = require('../dbConfig');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { sendICSConfirmation } = require('../events/sendICSConfirmation');

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

        //prompt for plan generation
        const prompt = `
        Generate a personalized weekly nutrition plan for a user with the following details:
        - Full Name: ${user.full_name}
        - Age: ${user.age}
        - Height: ${user.height}
        - Weight: ${user.weight}
        - Goals: ${JSON.stringify(user.goal)}
        - Daily Routine: ${user.daily_routine}
        - Allergies: ${JSON.stringify(user.allergies)}
        - Diet Preferences: ${JSON.stringify(user.diet_preferences)}
        - Exercise Preferences: ${JSON.stringify(user.exercise_preferences)}
        
        The nutrition plan should be structured for one week and include the following details:
        1. A detailed meal plan for each day of the week, including breakfast, lunch, dinner, and snacks.
        2. Specific meal timings for each day, aligned with the user's daily routine and workout schedule.
        3. Recommended foods for each meal, including quantities and nutritional information (calories, macronutrients).
        4. Adjustments based on the user's dietary preferences, allergies, and goals (e.g., weight loss, muscle gain).
        5. Recommendations for hydration and any supplements if necessary.
        
        Ensure that the plan is easy to follow and designed to meet the user’s goals while considering their daily routine and exercise schedule. The plan should be formatted in a way that can be easily converted into calendar events.
        `;
        

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent([prompt]);
        const content = result.response.text();

        await sendInChunks(dmChannel, content); // Send in chunks

        // Store the generated nutrition plan content for ICS generation
        user.nutritionPlanContent = content;
        // Call ICS confirmation after both plans have been sent
        await sendICSConfirmation(user, client, dmChannel); 
    } catch (error) {
        console.error(`Error sending nutrition plan to ${user.full_name}:`, error);
    }
}

module.exports = generateNutritionPlan;














// const prompt = `
// Generate a personalized nutrition plan for a user with the following details:
// - Full Name: ${user.full_name}
// - Age: ${user.age}
// - Height: ${user.height}
// - Weight: ${user.weight}
// - Goals: ${JSON.stringify(user.goal)}
// - Daily Routine: ${user.daily_routine}
// - Allergies: ${JSON.stringify(user.allergies)}
// - Diet Preferences: ${JSON.stringify(user.diet_preferences)}
// - Exercise Preferences: ${JSON.stringify(user.exercise_preferences)}

// The nutrition plan should be tailored to their goals and include a detailed meal plan with recommended foods, quantities, and nutritional information. Consider any dietary preferences or restrictions.
// `;
