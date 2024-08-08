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

router.get('/chat', (req, res) => {
    const userId = req.query.userId; // assuming userId is passed as a query parameter
    const channelId = req.query.channelId;
    console.log("channelId : ",channelId)
    if(userId && channelId){

        const sql = 'SELECT message,attachments FROM chats WHERE user_id = ? and channel_id = ?';
    
        pool.query(sql, [userId,channelId], (error, results) => {
            if (error) {
                console.error('Error executing query:', error);
                res.status(500).json({ message: 'Internal server error' });
            } else {
                res.status(200).json(results);
            }
        });

    }
    else if(userId && !channelId){

        const sql = 'SELECT message FROM chats WHERE user_id = ?';
    
        pool.query(sql, [userId], (error, results) => {
            if (error) {
                console.error('Error executing query:', error);
                res.status(500).json({ message: 'Internal server error' });
            } else {
                res.status(200).json(results);
            }
        });

    }
    else if(!userId && channelId){

        const sql = 'SELECT author,created_at,message FROM chats WHERE channel_id = ?';
    
        pool.query(sql, [channelId], (error, results) => {
            if (error) {
                console.error('Error executing query:', error);
                res.status(500).json({ message: 'Internal server error' });
            } else {
                res.status(200).json(results);
            }
        });

    }
});


router.post('/', (req, res) => {
    const data = req.body; 
    console.log(data)
    
    const sql = 'INSERT INTO chats (user_id, author, message,message_id,channel_id,attachments,is_log) VALUES ?';
    const values = data.map(obj => [
        obj.user_id, 
        obj.author, 
        obj.message,
        obj.message_id,
        obj.channelId,
        obj.attachments ? JSON.stringify(obj.attachments) : '[]', // Handle null attachments
        obj.is_log || 0 // Default to 0 if is_log is not provided
    ]);  

    pool.query(sql, [values], (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            res.status(500).json({ message: 'Internal server error' });
        } else {
            res.status(200).json({ message: 'Successfully inserted into chats table' });
        }
    });
});



module.exports = router;
