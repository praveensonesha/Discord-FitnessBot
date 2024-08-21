const mysql = require('mysql2/promise');
const dbConfig = require('../dbConfig');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const generateNutritionPlan = require('./generateNutritionPlan');


const fitnessCoachPool = mysql.createPool(dbConfig.fitness_coach);
const cubeClubPool = mysql.createPool(dbConfig.cube_club);
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function sendInChunks(channel, content) {
    const chunkSize = 2000; // Discord's maximum character limit
    for (let i = 0; i < content.length; i += chunkSize) {
        await channel.send(content.substring(i, i + chunkSize));
    }
}

async function generateWorkoutPlan(user,client) {
    try {
            const userId = user.user_id;
            const discordUser = await client.users.fetch(userId);
            let dmChannel = discordUser.dmChannel;
        
            if (!dmChannel) {
                dmChannel = await discordUser.createDM();
            }

            // Fetch equipment details
            const mobileNo = user.mobile_no; 
           const [cubeUser] = await cubeClubPool.query('SELECT id FROM users WHERE mobile = ?', [mobileNo]);
            
           if (cubeUser.length > 0) {
               const userId = cubeUser[0].id;

               // Fetch equipment details from customer_invoices
               const [invoices] = await cubeClubPool.query('SELECT SKU_code FROM customer_invoices WHERE user_id = ?', [userId]);
               
               // Retrieve product details for each SKU
               const productDetailsPromises = invoices.map(async (invoice) => {
                   const [productDetails] = await cubeClubPool.query(
                       'SELECT product_name, description FROM product_details_cubeclub WHERE SKU_code = ?',
                       [invoice.SKU_code]
                   );
                   return `${productDetails[0].product_name}: ${productDetails[0].description}`;
               });

               const equipmentDetails = await Promise.all(productDetailsPromises);
               const equipment = equipmentDetails.join(', '); 

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
               // // Access the generated content correctly
               // if (result && result.response && typeof result.response.text === 'function') {
               //     const content = await result.response.text(); // Ensure you await if text is a promise
               //     console.log(`Workout Plan for ${user.full_name}:`);
               //     console.log(content);
               // } 
               await sendInChunks(dmChannel, content); // Send in chunks

            // Store the generated workout plan content for ICS generation
            user.workoutPlanContent = content;
            // Call next function to generate the nutrition plan
            await generateNutritionPlan(user, client, dmChannel); 

           } else {
               console.log(`No matching user found in cube_club for mobile number ${mobileNo}.`);
           }       

    } catch (error) {
        console.error('Error generating workout plans:', error);
    }
}


module.exports = generateWorkoutPlan;














// const prompt = `
// Generate a personalized workout plan for a user with the following details:
// - Full Name: ${user.full_name}
// - Age: ${user.age}
// - Height: ${user.height}
// - Weight: ${user.weight}
// - Goals: ${JSON.stringify(user.goal)}
// - Daily Routine: ${user.daily_routine}
// - Allergies: ${JSON.stringify(user.allergies)}
// - Diet Preferences: ${JSON.stringify(user.diet_preferences)}
// - Exercise Preferences: ${JSON.stringify(user.exercise_preferences)}
// - Equipment Available: ${equipment}

// The workout plan should be suitable for their goals and make use of the available equipment. Provide a detailed plan including exercises, sets, reps, and rest periods.
// `;







