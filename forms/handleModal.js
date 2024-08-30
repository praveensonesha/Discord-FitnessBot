const axios = require('axios');

const handleModal = async (interaction) => {
    if (interaction.customId === 'userDetailsModal') {
        const details = {
            user_id: interaction.user.id,
            username: interaction.user.username,
            full_name: interaction.fields.getTextInputValue('fullNameInput'),
            age: interaction.fields.getTextInputValue('ageInput'),
            mobile_no: interaction.fields.getTextInputValue('mobileInput'),
            email: interaction.fields.getTextInputValue('emailInput'),
            height: interaction.fields.getTextInputValue('heightInput'),
            weight: interaction.fields.getTextInputValue('weightInput'),
            goal: interaction.fields.getTextInputValue('goalInput'),
            daily_routine: interaction.fields.getTextInputValue('routineInput'),
            diet_preferences: interaction.fields.getTextInputValue('dietInput'),
            allergies: interaction.fields.getTextInputValue('allergiesInput'),
            exercise_preferences: interaction.fields.getTextInputValue('exerciseTypeInput'),
            is_workout_plan_subscribe: interaction.fields.getTextInputValue('workoutPlanInput').toLowerCase() === 'yes' ? 1 : 0,
            is_nutrition_plan_subscribe: interaction.fields.getTextInputValue('nutritionPlanInput').toLowerCase() === 'yes' ? 1 : 0,
        };

        try {
            // Send the collected details to the Express server
            await axios.post('http://localhost:3000/userDetails', details);

            // Acknowledge the user
            await interaction.reply({ content: 'Thank you for providing your details!', ephemeral: true });
        } catch (error) {
            console.error('Error sending details to the server:', error);
            await interaction.reply({ content: 'There was an error processing your details. Please try again later.', ephemeral: true });
        }
    }
};

module.exports = { handleModal };
