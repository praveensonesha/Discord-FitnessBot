// checkPurchases.js
const cron = require('node-cron');
const mysql = require('mysql2/promise');
const dbConfig = require('../dbConfig'); // Import your configuration

const fitnessCoachPool = mysql.createPool(dbConfig.fitness_coach);
const cubeClubPool = mysql.createPool(dbConfig.cube_club);

// Function to check and update user purchases
const checkUserPurchases = async () => {

  try {
    console.log('Checking user purchases...');
    // Query to get mobile numbers from fitness_coach users
    const userQuery = `
      SELECT mobile_no FROM users;
    `;
    
    // Fetch user mobile numbers
    const [rows] = await fitnessCoachPool.query(userQuery);
    const normalizedPhones = rows.map(row => row.mobile_no.slice(-10)); // Normalize phone numbers
    const jsonPhones = JSON.stringify(normalizedPhones);
    
    console.log("Normalized phones:", normalizedPhones);
    console.log("JSON phones:", jsonPhones);

    // Invoice query to get products bought by each user
    const invoiceQuery = `
      SELECT u.mobile AS mobile, GROUP_CONCAT(pdc.product_name) AS products
      FROM customer_invoices ci
      LEFT JOIN cube_user u ON u.id = ci.user_id
      LEFT JOIN product_details_cubeclub pdc ON pdc.SKU_code = ci.SKU_code
      WHERE JSON_CONTAINS(?, JSON_QUOTE(u.mobile))
      GROUP BY u.id;
    `;
    
    // Fetch invoice data
    const [invoiceRows] = await cubeClubPool.query(invoiceQuery, [jsonPhones]);
    console.log("Invoice rows:", invoiceRows);

    // Prepare and execute update queries
    const updatePromises = invoiceRows.map(async (user) => {
      const updateProductQuery = `
        UPDATE users
        SET equipment = ?
        WHERE mobile_no = ?;
      `;
      // Use parameterized queries to prevent SQL injection
      await fitnessCoachPool.query(updateProductQuery, [user.products, user.mobile]);
    });

    // Wait for all update queries to complete
    await Promise.all(updatePromises);

  } catch (err) {
    console.error("Error in checkUserPurchases:", err);
  }
};

// Schedule the cron job to run daily at 10 AM
cron.schedule('0 10 * * *', () => {
    console.log('Running synchronization at scheduled time');
    checkUserPurchases();
  });
  
module.exports = checkUserPurchases;