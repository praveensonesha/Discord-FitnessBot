// checkPurchases.js
const cron = require('node-cron');
const mysql = require('mysql2/promise');
const dbConfig = require('../dbConfig'); // Import your configuration

const fitnessCoachPool = mysql.createPool(dbConfig.fitness_coach);
const cubeClubPool = mysql.createPool(dbConfig.cube_club);

async function checkUserPurchases() {
    try {
        console.log('Checking user purchases...');
        
        // Fetch users from fitness_coach
        const [fitnessUsers] = await fitnessCoachPool.query('SELECT mobile_no FROM users');

        for (const fitnessUser of fitnessUsers) {
            const mobileNo = fitnessUser.mobile_no;

            // Find matching user in cube_club
            const [cubeUser] = await cubeClubPool.query('SELECT id FROM users WHERE mobile = ?', [mobileNo]);
            
            if (cubeUser.length > 0) {
                const userId = cubeUser[0].id;

                // Check if the user has invoices
                const [invoices] = await cubeClubPool.query('SELECT * FROM customer_invoices WHERE user_id = ?', [userId]);

                if (invoices.length > 0) {
                    console.log(`User with mobile number ${mobileNo} has made purchases.`);
                } else {
                    console.log(`User with mobile number ${mobileNo} has not made any purchases.`);
                }
            } else {
                console.log(`No matching user found in cube_club for mobile number ${mobileNo}.`);
            }
        }
    } catch (error) {
        console.error('Error checking user purchases:', error);
    }
}

// Schedule the cron job to run every day at 12 PM
cron.schedule('0 12 * * *', checkUserPurchases);

module.exports = checkUserPurchases;
