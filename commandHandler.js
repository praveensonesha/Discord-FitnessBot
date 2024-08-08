const { ChannelType } = require('discord.js');
const processConversation = require("./processConversation")
const async = require('async');
class CommandHandler {
  constructor() {
    this.commands = {
      clear: this.clearCommand,
      analyze: this.analyzeCommand,
      log: this.logCommand,
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

  async analyzeCommand(message, args, conversationManager) {
    const conversationQueue = async.queue(processConversation, 1);
  
    const channelId = message.channelId;
  
    try {
      const response = await fetch(`http://localhost:3000/chats/chat?channelId=${channelId}`);
      const data = await response.json();
  
      let finalQuery = "";
      data.forEach(item => {
        finalQuery += item.author + " says : " + item.message + 'at time : ' + item.created_at + ".";
      });
  
      let messageContent = "Messages from discord channel: " + finalQuery + ".Aggregate the workout stats of every user while classifying these activities into categories. I want only stats. Also,ignore random conversation.Don't give dates.";
     //let messageContent = "Make a short horror story in 2500 words."
      // Push a task into the queue
      
      conversationQueue.push({ message, messageContent,analyze:true });
      console.log("52")
    } catch (error) {
      console.error('Error fetching or processing data:', error);
      await message.reply('> `Failed to analyze messages. Please try again later.`');
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
}

 

module.exports.CommandHandler = CommandHandler;