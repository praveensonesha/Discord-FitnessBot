require('dotenv').config();
const { SlashCommandBuilder, REST, Routes } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clears the conversation history.')
    .setDMPermission(true),
  new SlashCommandBuilder()
    .setName('analyze')
    .setDescription('Analyzes your Weekly Workouts.')
    .addStringOption(option =>
      option.setName('report_type')
        .setDescription('Type of report to generate')
        .setRequired(true)
        .addChoices(
          { name: 'Individual Report', value: 'individual' },
          { name: 'Community Report', value: 'community' }
        ))
    .setDMPermission(true),
  new SlashCommandBuilder()
    .setName('log')
    .setDescription('Log your Workout Stats.')
    .addStringOption(option =>
      option.setName('stats')
        .setDescription('Your Workout Stats')
        .setRequired(true))
    .setDMPermission(true),
  new SlashCommandBuilder()
    .setName('score')
    .setDescription('Get your Fitness Score.')
    .setDMPermission(true),
  new SlashCommandBuilder()
    .setName('faq')
    .setDescription('Ask a Frequently Asked Question.')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('Your question')
        .setRequired(true))
    .setDMPermission(true),
  new SlashCommandBuilder()
    .setName('getplans')
    .setDescription('Retrieve your workout or nutrition plan.')
    .addStringOption(option =>
      option.setName('plan')
        .setDescription('Select the plan you want to retrieve')
        .setRequired(true)
        .addChoices(
          { name: 'Workout Plan', value: 'workout' },
          { name: 'Nutrition Plan', value: 'nutrition' }
        ))
    .setDMPermission(true),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
  try {
    console.log(commands)
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error deploying slash commands:', error);
  }
})();