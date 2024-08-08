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
      "What's your preferred exercise type?"
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
      exercise_preferences: ''
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