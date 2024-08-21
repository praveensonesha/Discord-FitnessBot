const collectUserDetails = async (user, dmChannel, callback) => {
  const questions = [
      "What's your full name?",
      "How old are you?",
      "What's your mobile number?",
      "What's your email address?",
      "What's your height(cms)?",
      "What's your weight(kg)?",
      "What's your fitness goal?",
      "What's your daily routine?",
      "Do you follow any specific diet?",
      "Do you have any allergies?",
      "What's your preferred exercise type?",
      "Do you want to subscribe to a workout plan? (yes/no)",
      "Do you want to subscribe to a nutrition plan? (yes/no)"
  ];

  const details = {
      user_id: user.id,
      username: user.username,
      email: '', // Placeholder, as email is not typically available from Discord user object
      full_name: '',
      mobile_no: '',
      age: '',
      height: '',
      weight: '',
      goal: '',
      daily_routine:'',
      diet_preferences: '',
      allergies: '',
      exercise_preferences: '',
      is_workout_plan_subscribe: 0,
      is_nutrition_plan_subscribe: 0
  };

  const askQuestion = async (questionIndex = 0) => {
      if (questionIndex < questions.length) {
          await dmChannel.send(questions[questionIndex]);

          const filter = response => response.author.id === user.id;
          const collector = dmChannel.createMessageCollector({ filter, max: 1, time: 60000 });

          collector.on('collect', async response => {
              switch (questionIndex) {
                  case 0: details.full_name = response.content; break;
                  case 1: details.age = response.content; break;
                  case 2: details.mobile_no = response.content; break;
                  case 3: details.email = response.content; break;
                  case 4: details.height = response.content; break;
                  case 5: details.weight = response.content; break;
                  case 6: details.goal = response.content; break;
                  case 7: details.daily_routine = response.content; break;
                  case 8: details.diet_preferences = response.content; break;
                  case 9: details.allergies = response.content; break;
                  case 10: details.exercise_preferences = response.content; break;
                  case 11: 
                      details.is_workout_plan_subscribe = response.content.toLowerCase() === 'yes' ? 1 : 0;
                      break;
                  case 12: 
                      details.is_nutrition_plan_subscribe = response.content.toLowerCase() === 'yes' ? 1 : 0;
                      break;
              }
              askQuestion(questionIndex + 1);
          });

          collector.on('end', collected => {
              if (collected.size === 0) {
                  dmChannel.send("You didn't respond in time. Please try again.");
              }
          });
      } else {
          await callback(details);
          await dmChannel.send("Thank you for providing your details!");
      }
  };

  askQuestion();
};

module.exports = { collectUserDetails };


// const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } = require('discord.js');

// const collectUserDetails = () => {
//     const modal = new ModalBuilder()
//         .setCustomId('userDetailsModal')
//         .setTitle('User Details');

//     const fullNameInput = new TextInputBuilder()
//         .setCustomId('fullNameInput')
//         .setLabel("What's your full name?")
//         .setStyle(TextInputStyle.Short);

//     const ageInput = new TextInputBuilder()
//         .setCustomId('ageInput')
//         .setLabel("How old are you?")
//         .setStyle(TextInputStyle.Short);

//     const mobileInput = new TextInputBuilder()
//         .setCustomId('mobileInput')
//         .setLabel("What's your mobile number?")
//         .setStyle(TextInputStyle.Short);

//     const emailInput = new TextInputBuilder()
//         .setCustomId('emailInput')
//         .setLabel("What's your email address?")
//         .setStyle(TextInputStyle.Short);

//     const heightInput = new TextInputBuilder()
//         .setCustomId('heightInput')
//         .setLabel("What's your height (cm)?")
//         .setStyle(TextInputStyle.Short);

//     const weightInput = new TextInputBuilder()
//         .setCustomId('weightInput')
//         .setLabel("What's your weight (kg)?")
//         .setStyle(TextInputStyle.Short);

//     const goalInput = new TextInputBuilder()
//         .setCustomId('goalInput')
//         .setLabel("What's your fitness goal?")
//         .setStyle(TextInputStyle.Short);

//     const routineInput = new TextInputBuilder()
//         .setCustomId('routineInput')
//         .setLabel("Describe your daily routine")
//         .setStyle(TextInputStyle.Paragraph);

//     const dietInput = new TextInputBuilder()
//         .setCustomId('dietInput')
//         .setLabel("Do you follow a specific diet?")
//         .setStyle(TextInputStyle.Short);

//     const allergiesInput = new TextInputBuilder()
//         .setCustomId('allergiesInput')
//         .setLabel("Do you have any allergies?")
//         .setStyle(TextInputStyle.Short);

//     const exerciseTypeInput = new TextInputBuilder()
//         .setCustomId('exerciseTypeInput')
//         .setLabel("Preferred exercise type?")
//         .setStyle(TextInputStyle.Short);

//     const workoutPlanInput = new TextInputBuilder()
//         .setCustomId('workoutPlanInput')
//         .setLabel("Subscribe to workout plan? (yes/no)")
//         .setStyle(TextInputStyle.Short);

//     const nutritionPlanInput = new TextInputBuilder()
//         .setCustomId('nutritionPlanInput')
//         .setLabel("Subscribe to nutrition plan? (yes/no)")
//         .setStyle(TextInputStyle.Short);

//     modal.addComponents(
//         new ActionRowBuilder().addComponents(fullNameInput),
//         new ActionRowBuilder().addComponents(ageInput),
//         new ActionRowBuilder().addComponents(mobileInput),
//         new ActionRowBuilder().addComponents(emailInput),
//         new ActionRowBuilder().addComponents(heightInput),
//         new ActionRowBuilder().addComponents(weightInput),
//         new ActionRowBuilder().addComponents(goalInput),
//         new ActionRowBuilder().addComponents(routineInput),
//         new ActionRowBuilder().addComponents(dietInput),
//         new ActionRowBuilder().addComponents(allergiesInput),
//         new ActionRowBuilder().addComponents(exerciseTypeInput),
//         new ActionRowBuilder().addComponents(workoutPlanInput),
//         new ActionRowBuilder().addComponents(nutritionPlanInput)
//     );

//     return modal;
// };

// module.exports = { collectUserDetails };

