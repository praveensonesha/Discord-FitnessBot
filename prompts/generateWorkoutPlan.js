const mysql = require('mysql2/promise');
const dbConfig = require('../dbConfig');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const generateNutritionPlan = require('./generateNutritionPlan');
const axios = require('axios');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function sendInChunks(channel, content) {
    const chunkSize = 2000; // Discord's maximum character limit
    for (let i = 0; i < content.length; i += chunkSize) {
        await channel.send(content.substring(i, i + chunkSize));
    }
}


async function generateWorkoutPlan(user, client) {
    try {
        const userId = user.user_id;
        const discordUser = await client.users.fetch(userId);
        let dmChannel = discordUser.dmChannel;

        if (!dmChannel) {
            dmChannel = await discordUser.createDM();
        }

        // Fetch equipment details from the users table
        const equipment = user.equipment || 'No equipment specified'; // Default value if equipment is not set

        // Create prompt for workout plan
        const prompt = `
        Generate a personalized weekly workout plan for a user with the following details:
        - Full Name: ${user.full_name}
        - Age: ${user.age}
        - Height: ${user.height}
        - Weight: ${user.weight}
        - Goals: ${JSON.stringify(user.goal)}
        - Daily Routine: ${user.daily_routine}
        - Allergies: ${JSON.stringify(user.allergies)}
        - Diet Preferences: ${JSON.stringify(user.diet_preferences)}
        - Exercise Preferences: ${JSON.stringify(user.exercise_preferences)}
        - Equipment Available: ${equipment}
        
        The workout plan should be structured for one week and include the following details:
        1. Specific exercises for each day of the week.
        2. The exact time of day for each workout session, considering the user's daily routine.
        3. Detailed instructions for each exercise, including sets, reps, and rest periods.
        4. Any recommendations for warm-ups, cool-downs, or stretches.
        5. Notes on how to adjust the intensity or variations if needed.
        
        Ensure that the plan is tailored to the user’s goals and makes optimal use of the available equipment. The plan should be formatted in a way that can be easily converted into calendar events.
        `;

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent([prompt]);
        const content = result.response.text();
        await sendInChunks(dmChannel, content); // Send in chunks

        // Save the workout plan in the database
        await axios.post('http://localhost:3000/users/savePlan', {
            username: user.username,
            workout_plan: content,
        });

        // Store the generated workout plan content for ICS generation
        user.workoutPlanContent = content;
        // Call next function to generate the nutrition plan
        await generateNutritionPlan(user, client, dmChannel);

    } catch (error) {
        console.error('Error generating workout plans:', error);
    }
}


module.exports = generateWorkoutPlan;








