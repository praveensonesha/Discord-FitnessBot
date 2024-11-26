require('dotenv').config();
const express = require('express');
const axios = require("axios")
const fs = require("fs");
const bodyParser = require('body-parser')
const { Client, GatewayIntentBits, ChannelType, Events, ActivityType,GuildMessageManager } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { config } = require('./config');
const { ConversationManager } = require('./conversationManager');
const { CommandHandler } = require('./commandHandler');
const processConversation = require("./processConversation")
const async = require('async');
const { handleNewMemberEvent } = require('./events/newMember');
const checkIncompleteUsers = require('./cron_jobs/checkIncompleteUsers');
const workoutReminder = require('./cron_jobs/workoutReminder');
const checkUserPurchases = require('./cron_jobs/checkPurchases');
const scheduleWeeklyPlans = require('./cron_jobs/sendPlansCronJob');
const serverActive = require('./cron_jobs/serverActive');
const generateWorkoutPlan = require('./prompts/generateWorkoutPlan');
const generateNutritionPlan = require('./prompts/generateNutritionPlan');
const { handleModal } = require('./forms/handleModal');  // Import the handleModal function




const app = express();
app.use(bodyParser.json({ limit: '50mb' })); // Adjust the limit as needed
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
const port = process.env.PORT || 3000;
const botToken = process.env.DISCORD_BOT_TOKEN
const mysql = require('mysql');
const chatsRoute = require("./routes/chatsRoute");
const usersRoute = require("./routes/usersRoute")

app.use('/chats',chatsRoute)
app.use('/users',usersRoute)
app.get('/', (req, res) => {
  res.send('Gemini Discord Bot is running!');
});

app.listen(port, () => {
  console.log(`Gemini Discord Bot is listening on port ${port}`);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});
const channel = client.channels.cache.get("1265532368882499675");
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const conversationManager = new ConversationManager();
const commandHandler = new CommandHandler();
const conversationQueue = async.queue(processConversation, 1);



//crons jobs
workoutReminder(client);
checkIncompleteUsers(client);
scheduleWeeklyPlans(client);
serverActive();

const activities = [
  { name: 'Assisting users', type: ActivityType.Playing },
  { name: 'Powered by Google Generative AI', type: ActivityType.Listening },
  { name: 'Available for chat', type: ActivityType.Watching }
];
let activityIndex = 0;

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}!`);
  // Set the initial status
  client.user.setPresence({
    activities: [activities[activityIndex]],
    status: 'online',
  });
  // Change the activity every 30000ms (30 seconds)
  setInterval(() => {
    activityIndex = (activityIndex + 1) % activities.length;
    client.user.setPresence({
      activities: [activities[activityIndex]],
      status: 'online',
    });
  }, 30000);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isCommand()) return;
  if (interaction.commandName === 'clear') {
    try {
      console.log(interaction.user.id)
      conversationManager.clearHistory(interaction.user.id);
      await interaction.reply('Your conversation history has been cleared.');
    } catch (error) {
      console.error('Error handling /clear command:', error);
      try {
        await interaction.reply('Sorry, something went wrong while clearing your conversation history.');
      } catch (replyError) {
        console.error('Error sending error message:', replyError);
      }
    }
    return;
  }

  // In the InteractionCreate event handler
  if(interaction.commandName === "log"){
    try {
      const stats = interaction.options.getString('stats');
      await commandHandler.logCommand(interaction, stats, conversationManager);
    } catch (error) {
      console.error('Error handling /log command:', error);
      try {
        await interaction.reply({ content: 'Sorry, something went wrong while logging your workout.', ephemeral: true });
      } catch (replyError) {
        console.error('Error sending error message:', replyError);
      }
    }
    return;
  }

  // if (interaction.commandName === 'analyze') {
  //   try {
  //     if (commandName === 'analyze') {
  //       // Check if interaction is a command and use interaction.options to get arguments
  //       const reportType = interaction.options.getString('type'); // Adjust based on your command's options

  //       if (!reportType) {
  //           await interaction.reply('> `Please provide a report type: "individual" or "community".`');
  //           return;
  //       }

  //       // Call the analyzeCommand function with interaction and arguments
  //       await commandHandler.analyzeCommand(interaction, [reportType], conversationManager);
  //   }
  //   } catch (error) {
  //     console.error('Error handling /analyze command:', error);
  //     try {
  //       await interaction.reply('Sorry, something went wrong while saving your conversation.');
  //     } catch (replyError) {
  //       console.error('Error sending error message:', replyError);
  //     }
  //   }
  //   return;
  // }  

  if (interaction.commandName === 'analyze') {
    try {
        await interaction.deferReply();
        const reportType = interaction.options.getString('report_type');

        if (!reportType) {
            await interaction.reply('> `Please provide a report type: "individual" or "community".`');
            return;
        }

        // Call the analyzeCommand function with interaction and arguments
        await commandHandler.analyzeCommand(interaction, [reportType], conversationManager);
    } catch (error) {
        console.error('Error handling /analyze command:', error);
        try {
            await interaction.reply('Sorry, something went wrong while processing your analyze command.');
        } catch (replyError) {
            console.error('Error sending error message:', replyError);
        }
    }
    return;
}


  if (interaction.commandName === 'score') {
    await commandHandler.scoreCommand(interaction);
  }

  if (interaction.commandName === 'getplans') {
    await commandHandler.getPlansCommand(interaction);
  }

  if (interaction.commandName === 'faq') {
    try {
      await interaction.deferReply(); 
      const query = interaction.options.getString('query');
      const response = await axios.post('http://localhost:3000/chats/qna', { query });
      await interaction.editReply(response.data);
    } catch (error) {
      console.error('Error handling /faq command:', error);
      try {
        await interaction.editReply('Sorry, something went wrong while processing your FAQ query.');
      } catch (replyError) {
        console.error('Error sending error message:', replyError);
      }
    }
    return;
  }

});

client.on(Events.GuildMemberAdd,(member)=>handleNewMemberEvent(member,client))

client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot) return;
    console.log("message log for attachment type : ",message)

    // Convert attachments to Base64
    
    if(!message.mentions.users.has(client.user.id)){
      const attachments = await Promise.all(message.attachments.map(async (attachment) => {
        try {
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

          const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
          const buffer = Buffer.from(response.data, 'binary');
          const image = {
            inlineData: {
              data: buffer.toString('base64'),
              mimeType: attachment.contentType,
            },
          };
          const prompt = "If this is a fitness related image extract workout stats like calories, duration,sactivities or whatever applicable."
          const result = await model.generateContent([prompt, image]);
          return result.response.text()
        } catch (error) {
          console.error(`Error processing attachment ${attachment.url}:`, error);
          return null;
        }
      }));
      const storeInDatabase = await fetch("http://localhost:3000/chats", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify([{
          user_id:message.author.id,
          author:message.author.username,
          message:message.content,
          message_id:message.id,
          channelId:message.channelId,
          attachments:attachments,
        }]),
      });
    }


    const isDM = message.channel.type === ChannelType.DM;
    
    // if (isDM || message.mentions.users.has(client.user.id)) {
    if (message.mentions.users.has(client.user.id)) {

      const attachments = await Promise.all(message.attachments.map(async (attachment) => {
        try {
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

          const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
          const buffer = Buffer.from(response.data, 'binary');
          const image = {
            inlineData: {
              data: buffer.toString('base64'),
              mimeType: attachment.contentType,
            },
          };
          const prompt = "If this is a fitness related image extract workout stats like calories, duration,sactivities or whatever applicable."
          const result = await model.generateContent([prompt, image]);
          return result.response.text()

        } catch (error) {
          console.error(`Error processing attachment ${attachment.url}:`, error);
          return null;
        }
      }));
      const response = await fetch(`http://localhost:3000/chats/chat?userId=${message.author.id}&channelId=${message.channelId}`);

      const data = await response.json();
      console.log(data)
      let finalQuery = ""
      console.log(data)
      data.forEach(item => {
        finalQuery += item.message + '.' + "attachments : "+item.attachments
      });

      let messageContent = message.content.replace(new RegExp(`<@!?${client.user.id}>`), '').trim();

      messageContent += "Here are some attachments : " + attachments
      
      if (messageContent === '') {
        await message.reply("> `It looks like you didn't say anything. What would you like to talk about?`");

        return;
      }
      
      messageContent = "MyFitnessHistory: " + finalQuery + " currentFitnessQuery: " + messageContent + "If the currentFitnessQuery DOES NOT requires context then don't consider MyFitnessHistory .If the query is health/fitness related then only respond.Else say that i can answer only health related queries. Additonally Answer in about 1000 characters always"

      console.log("This is the prompt that goes with tagging : ",messageContent)
      conversationQueue.push({ message, messageContent,analyze:false });
      const storeInDatabase = await fetch("http://localhost:3000/chats", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify([{
          user_id:message.author.id,
          author:message.author.username,
          message:message.content,
          message_id:message.id,
          channelId:message.channelId,
          attachments:attachments,
        }]),
      });
    }
  } catch (error) {
    console.error('Error processing the message:', error);
    // await message.reply('Sorry, something went wrong!');
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);