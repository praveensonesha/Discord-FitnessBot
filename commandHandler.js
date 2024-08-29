const { ChannelType } = require('discord.js');
const processConversation = require("./processConversation");
const { GoogleGenerativeAI } = require('@google/generative-ai');
const async = require('async');
const { rsvgVersion } = require('canvas');
const axios = require('axios');
class CommandHandler {
  constructor() {
    this.commands = {
      clear: this.clearCommand,
      analyze: this.analyzeCommand,
      log: this.logCommand,
      getplans: this.getPlansCommand,
    };
  }

  isCommand(message) {
    return message.content.startsWith('/');
  }

  async handleCommand(message, conversationManager) {
    const [commandName, ...args] = message.content.slice(1).split(' ');
    const command = this.commands[commandName];

    if (command) {
      await command(message, args, conversationManager);
    } else {
      // Ignore unknown commands
      return;
    }
  }

  async clearCommand(message, args, conversationManager) {
    console.log("Hello")
    conversationManager.clearHistory(message.author.id);
    await message.reply('> `Your conversation history has been cleared.`');
  }
  
  async analyzeCommand(interaction, args, conversationManager) {
    const reportType = args[0]; // 'individual' or 'community'
    const userId = interaction.user.id;
    const channelId = interaction.channelId;

    const conversationQueue = async.queue(processConversation, 1);

    try {
        let finalQuery = "";

        if (reportType === 'individual') {
            const response = await fetch(`http://localhost:3000/chats/chat?userId=${userId}`);
            const data = await response.json();
            data.forEach(item => {
              finalQuery += `{Author:${item.author} ,Logs: ${item.message} `;
            });
        } else if (reportType === 'community') {
            const response = await fetch(`http://localhost:3000/chats/chat?channelId=${channelId}`);
            const data = await response.json();
            console.log(data);
            data.forEach(item => {
                finalQuery += `{Author:${item.author} ,Logs: ${item.message} `;
            });
        } else {
            await interaction.editReply('> `Invalid report type. Use "individual" or "community".`');
            return;
        }
        console.log(finalQuery);
        if(finalQuery == ""){
          interaction.editReply('> `Please run this after some workout is logged !😓`');
        }else{
        let ultrafinalQuery = `Stats:[${finalQuery}]Aggregate the workout stats of every user while classifying these activities into categories.Don't give dates or tabular data`;
        console.log(ultrafinalQuery);
        conversationQueue.push({ message: interaction, messageContent: ultrafinalQuery, analyze: true });

        await interaction.editReply('> `Analyzing the data...`');
        }

    } catch (error) {
        console.error('Error fetching or processing data:', error);
        await interaction.editReply('> `Failed to analyze messages. Please try again later.`');
    }
}


  async logCommand(interaction, workoutStats, conversationManager) {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    if (!workoutStats) {
      await interaction.reply({ content: 'Please provide your workout stats after the /log command.', ephemeral: true });
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{
          user_id: userId,
          author: username,
          message: workoutStats,
          message_id: interaction.id,
          channelId: interaction.channelId,
          attachments: [],
          is_log: 1,
        }]),
      });

      if (response.ok) {
        await interaction.reply({ content: 'Your workout has been logged successfully!', ephemeral: true });
      } else {
        throw new Error('Failed to log workout');
      }
    } catch (error) {
      console.error('Error logging workout:', error);
      await interaction.reply({ content: 'Failed to log your workout. Please try again later.', ephemeral: true });
    }
  }

  async scoreCommand(interaction) {
    const userId = interaction.user.id;
    try {
        await interaction.deferReply({ ephemeral: true });
        // Make sure to include the user_id as a query parameter
        const response = await fetch(`http://localhost:3000/users/score`,{
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId
          }),
        });

        if (!response.ok) {
            console.log(response);
            throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }

        let userData;
        try {
            userData = await response.json();
        } catch (jsonError) {
            const text = await response.text();
            console.error('Response is not valid JSON:', text);
            throw new Error('Failed to parse JSON from server response');
        }

        if (userData) {
            const { momentum_score, current_streak, max_streak } = userData;

            // Generate a motivating message using Google Generative AI
            const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
            const prompt = `Here is the performance summary for the user:
            - **Momentum Score:** ${momentum_score}
            - **Current Streak:** ${current_streak} days
            - **Maximum Streak:** ${max_streak} days
            
            Please provide this information in a clear and motivating format with an encouraging message.`;            
            const result = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).generateContent([prompt]);
            const messageContent = result.response.text();
            await interaction.editReply({ content: messageContent, ephemeral: true });
        } else {
            await interaction.editReply({ content: 'User data not found. Please ensure you are registered and have logged activities.', ephemeral: true });
        }
    } catch (error) {
        console.error('Error retrieving user score:', error);
        await interaction.editReply({ content: 'Failed to retrieve your score. Please try again later.', ephemeral: true });
    }
  }

  async getPlansCommand(interaction) {
    const planType = interaction.options.getString('plan');
    const userId = interaction.user.id;

    try {
        const response = await axios.post(`http://localhost:3000/users/plans/${planType}`, {
            userId: userId
        });
        const planData = response.data;
        // console.log(planData);

        if (planData && planData.plan) {
          const plan = planData.plan;
          const chunkSize = 2000; // Discord's maximum character limit
          for (let i = 0; i < plan.length; i += chunkSize) {
              const chunk = plan.substring(i, i + chunkSize);
              await interaction.user.send(chunk);
          }
          await interaction.reply({ content: `I've sent your ${planType} plan to your DM !`, ephemeral: true });
      } else {
            await interaction.reply({ content: `No ${planType} plan found for you.`, ephemeral: true });
        }
    } catch (error) {
        console.error('Error retrieving plans:', error);
    }
}

}

module.exports.CommandHandler = CommandHandler;