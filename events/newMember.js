const { collectUserDetails } = require('../forms/userDetailsForm');
const axios = require('axios');
const generateWorkoutPlan = require('../prompts/generateWorkoutPlan');

const handleNewMemberEvent = async (member,client) => {
    console.log(`New member joined: ${member.user.tag} (ID: ${member.id})`);
    console.log(`Server: ${member.guild.name} (ID: ${member.guild.id})`);
    //add to users
    const newUser = {
      user_id: member.id,
      username: member.user.username,
    };
    try {
         await axios.post('https://discord-fitnessbot.onrender.com/users/addUser', newUser);
      } catch (error) {
        console.error('Error sending user details to server:', error);
      }



    // Send a DM to the new member
    try {
      const dmChannel = await member.createDM();
        await dmChannel.send(`
          🎉 **Welcome to our server, ${member.user.username}!** 🎉
          
          We’re excited to have you here! 💪✨
          
          🔍 **Track Your Progress:** Monitor your habit scores and streaks. 📈🏆
          
          🏋️‍♂️ **Personalized Workouts Plan:** Get plans based on your equipment and goals. 🏋️‍♀️🗓️
          
          🥗 **Personalized Nutrition Plan:** Receive meal plans tailored to your diet and goals. 🍎🥑
          
          💡 **Fitness Insights:** Analyze workouts and get answers to your fitness questions. 📊🤔

          ❓ **Fitness Q&A:** Have a question? Our bot is here to help with quick answers.
          
          🚀 Let's start by filling out some basic info so we can tailor everything to your needs! 🌟🚀
          `);   

      collectUserDetails(member.user, dmChannel, async (details) => {
          try {
              const response = await axios.post('https://discord-fitnessbot.onrender.com/users/userDetails', details);
              if (response.status === 200) {
                  await dmChannel.send("🎉 Your details have been successfully saved! Thank you for providing all the information. 💪");

                  // If the user subscribes to plans, generate and send the plans
                  if (details.is_workout_plan_subscribe || details.is_nutrition_plan_subscribe) {
                      await generateWorkoutPlan(details, client);
                  }
              } else {
                  await dmChannel.send("😔 There was an issue saving your details. Please try again later, and let us know if the problem persists. 💬");
              }
          } catch (error) {
              console.error('Error sending user details to server:', error);
              await dmChannel.send("There was an error saving your details. Please try again later.");
          }
      });
  } catch (error) {
      console.error('Error sending DM to new member:', error);
  }
};
module.exports = { handleNewMemberEvent };