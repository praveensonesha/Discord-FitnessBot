const express = require('express');
const router = express.Router();
const mysql = require('mysql2');

router.use(express.json());
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'fitness_coach',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

router.post('/addUser', (req, res) => {
    const { user_id, username } = req.body;
  
    if (!user_id || !username) {
      return res.status(400).json({ error: 'User ID and username are required' });
    }
  
    // Insert user into the database
    const sql = 'INSERT INTO profile (user_id, username) VALUES (?, ?)';
    pool.query(sql, [user_id, username], (error, results) => {
      if (error) {
        console.error('Error inserting user into database:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
  
      res.status(200).json({ message: 'User added successfully' });
    });
  });
  


router.post('/userDetails', (req, res) => {
    const details = req.body;
    console.log(details);

    const sql = `
        INSERT INTO users (
            user_id, username, email, full_name, mobile_no, age, height, weight, goal, 
            daily_routine, allergies, diet_preferences, exercise_preferences
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            username = VALUES(username), 
            email = VALUES(email), 
            full_name = VALUES(full_name), 
            mobile_no = VALUES(mobile_no),
            age = VALUES(age), 
            height = VALUES(height), 
            weight = VALUES(weight), 
            goal = VALUES(goal),
            daily_routine = VALUES(daily_routine), 
            allergies = VALUES(allergies), 
            diet_preferences = VALUES(diet_preferences), 
            exercise_preferences = VALUES(exercise_preferences)
    `;

    const values = [
        details.user_id,
        details.username,
        details.email,
        details.full_name,
        details.mobile_no,
        details.age,
        details.height,
        details.weight,
        JSON.stringify(details.goal),
        details.daily_routine,
        JSON.stringify(details.allergies),
        JSON.stringify(details.diet_preferences),
        JSON.stringify(details.exercise_preferences)
    ];

    pool.query(sql, values, (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            res.status(500).json({ message: 'Internal server error' });
        } else {
            res.status(200).json({ message: 'User details successfully inserted' });
        }
    });
});

  module.exports = router;
