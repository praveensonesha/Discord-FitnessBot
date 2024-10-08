const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const dbConfig = require('../dbConfig');

router.use(express.json());
const fitnessCoachPool = mysql.createPool(dbConfig.fitness_coach);

router.post('/addUser', (req, res) => {
    const { user_id, username } = req.body;

    if (!user_id || !username) {
        return res.status(400).json({ error: 'User ID and username are required' });
    }

    // Insert user into the database
    const sql = 'INSERT INTO profile (user_id, username) VALUES (?, ?)';
    fitnessCoachPool.query(sql, [user_id, username], (error, results) => {
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
            daily_routine, allergies, diet_preferences, exercise_preferences,
            is_workout_plan_subscribe, is_nutrition_plan_subscribe
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            exercise_preferences = VALUES(exercise_preferences),
            is_workout_plan_subscribe = VALUES(is_workout_plan_subscribe),
            is_nutrition_plan_subscribe = VALUES(is_nutrition_plan_subscribe)
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
        JSON.stringify(details.exercise_preferences),
        details.is_workout_plan_subscribe,
        details.is_nutrition_plan_subscribe
    ];

    fitnessCoachPool.query(sql, values, (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            res.status(500).json({ message: 'Internal server error' });
        } else {
            res.status(200).json({ message: 'User details successfully inserted' });
        }
    });
});

router.post('/score', (req, res) => {
        const { user_id } = req.body;
        console.log("Score Provided to user_id",user_id);
    
        if (!user_id) {
            return res.status(400).json({ error: 'User ID is required' });
        } 
        const sql = `
            SELECT momentum_score, current_streak, max_streak
            FROM users
            WHERE user_id = ?
        `;
    
        fitnessCoachPool.query(sql, [user_id], (error, results) => {
            if (error) {
                console.error('Error fetching user score:', error);
                return res.status(500).json({ error: 'Internal server error' });
            }
    
            if (results.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
    
            res.status(200).json(results[0]);
        });
});

router.post('/savePlan', (req, res) => {
    const { username, workout_plan, nutrition_plan } = req.body;

    if (!username || (!workout_plan && !nutrition_plan)) {
        return res.status(400).json({ error: 'Username and at least one plan (workout/nutrition) are required' });
    }

    const sql = `
        INSERT INTO plans (username, workout_plan, nutrition_plan)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            workout_plan = COALESCE(VALUES(workout_plan), workout_plan),
            nutrition_plan = COALESCE(VALUES(nutrition_plan), nutrition_plan),
            updated_at = CURRENT_TIMESTAMP
    `;

    const values = [username, workout_plan, nutrition_plan];

    fitnessCoachPool.query(sql, values, (error, results) => {
        if (error) {
            console.error('Error saving plan to the database:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }

        res.status(200).json({ message: 'Plan saved successfully' });
    });
});


router.post('/plans/:planType', (req, res) => {
    const { userId } = req.body;
    const { planType } = req.params;

    if (!['workout', 'nutrition'].includes(planType)) {
        return res.status(400).json({ error: 'Invalid plan type' });
    }

    const sql = `
        SELECT ${planType === 'workout' ? 'workout_plan' : 'nutrition_plan'} AS plan
        FROM plans p
        left join users u on u.username = p.username 
        WHERE u.user_id = ?;
    `;

    fitnessCoachPool.query(sql, [userId], (error, results) => {
        if (error) {
            console.error('Error fetching plan:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        res.status(200).json(results[0]);
    });
});

module.exports = router;
