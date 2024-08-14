const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const dbConfig = require('../dbConfig');
const { ChromaClient } = require('chromadb');
const { GoogleGenerativeAI } = require('@google/generative-ai');


const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const fitnessCoachPool = mysql.createPool(dbConfig.fitness_coach);
router.use(express.json());

router.get('/chat', (req, res) => {
    const userId = req.query.userId; // assuming userId is passed as a query parameter
    const channelId = req.query.channelId;
    console.log("channelId : ",channelId)
    if(userId && channelId){

        const sql = 'SELECT message,attachments FROM chats WHERE user_id = ? and channel_id = ?';
    
        fitnessCoachPool.query(sql, [userId,channelId], (error, results) => {
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
    
        fitnessCoachPool.query(sql, [userId], (error, results) => {
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
    
        fitnessCoachPool.query(sql, [channelId], (error, results) => {
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

    fitnessCoachPool.query(sql, [values], (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            res.status(500).json({ message: 'Internal server error' });
        } else {
            res.status(200).json({ message: 'Successfully inserted into chats table' });
        }
    });
});

router.post('/qna',async(req,res)=>{
    const payload = req.body;
    const {phone,query} = payload;
    console.log(phone);
    try {
        // Execute the query
        const client = new ChromaClient();
        const collection = await client.getOrCreateCollection({
            name: "my_collection",
        });
      
        const results = await collection.query({
            queryTexts: [`${query}`], // Chroma will embed this for you
            // queryTexts: ["Will the products be safe to use?"], // Chroma will embed this for you
            nResults: 4, // How many results to return
        });
      
        console.log(results.documents);
        const prompt = `As a customer support representative, provide a helpful and friendly response based on the information from the provided document. Here are the document results: Document: ${results.documents}. The user has asked the following question: "${query}". Based on the document and available information, construct a relevant and accurate response to the user's query. If the document doesn't directly answer the query, politely explain what the document covers and suggest any alternative actions or information that might be helpful to the user.`
        console.log(prompt);
        const report = await model.generateContent(prompt);
        console.log("text",report.response.text);
        

        res.status(200).send(report.response.text());

       
    } catch (error) {
        console.error('Error querying the database:', error);
        console.log(error)
            res.status(500).send({
            success:false,
            message:'Error in userQuery',
            error ,
            });
    }
    
});

module.exports = router;
