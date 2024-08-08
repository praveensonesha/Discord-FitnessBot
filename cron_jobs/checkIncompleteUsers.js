const cron = require('node-cron');
const { Client } = require('discord.js');
const axios = require('axios');
const mysql = require('mysql2');
const { collectUserDetails } = require('../forms/userDetailsForm');

// Create a connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'fitness_coach',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const checkIncompleteUserrrr = async (client) => {
  try {
    console.log('Checking incomplete users...');
    const sql = 'SELECT * FROM profile WHERE is_completed = 0';
    
    pool.query(sql, async (error, results) => {
      if (error) {
        console.error('Error fetching incomplete users:', error);
        return;
      }

      for (const user of results) {
        try {
          const member = await client.users.fetch(user.user_id);
          const dmChannel = await member.createDM();
          await dmChannel.send("It looks like you haven't completed your profile details yet. Please fill out the form again to complete your profile.");
          console.log("member",member);
          collectUserDetails(member, dmChannel, async (details) => {
            try {
              const response = await axios.post('http://localhost:3000/users/userDetails', details);
              if (response.status === 200) {
                dmChannel.send("Your details have been successfully saved!");
              } else {
                dmChannel.send("There was an issue saving your details. Please try again later.");
              }
            } catch (error) {
              console.error('Error sending user details to server:', error);
              dmChannel.send("There was an error saving your details. Please try again later.");
            }
          });
        } catch (error) {
          console.error(`Error sending DM to user ${user.user_id}:`, error);
        }
      }
    });
  } catch (error) {
    console.error('Error checking incomplete users:', error);
  }
};

function checkIncompleteUsers(client) {
    // Schedule the cron job to run every day at 9 AM
    cron.schedule('0 9 * * *', async () => { 
      console.log('Running profile completion reminder cron job');
      await checkIncompleteUserrrr(client);
    });
  }
module.exports = checkIncompleteUsers;
