const ics = require('ics');
const fs = require('fs');
const path = require('path');

async function generateICS(user) {
    try {
        const events = [];

        if (user.workoutPlanContent) {
            const workoutEvent = {
                start: [2024, 8, 13, 9, 0],
                duration: { hours: 1 },
                title: `Your Workout Plan`,
                description: user.workoutPlanContent,
            };
            events.push(workoutEvent);
        }

        if (user.nutritionPlanContent) {
            const nutritionEvent = {
                start: [2024, 8, 13, 10, 0],
                duration: { hours: 1 },
                title: `Your Nutrition Plan`,
                description: user.nutritionPlanContent,
            };
            events.push(nutritionEvent);
        }

        const { error, value } = ics.createEvents(events);

        if (error) {
            console.error('Error creating ICS file:', error);
            return;
        }

        const fileName = `user_${user.user_id}_combined_plan.ics`;
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }
        const filePath = path.join(tempDir, fileName);
        fs.writeFileSync(filePath, value);

        console.log(`ICS file generated: ${filePath}`);
        return filePath;
    } catch (error) {
        console.error('Error generating ICS file:', error);
    }
}

function deleteICS(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`ICS file deleted: ${filePath}`);
        }
    } catch (error) {
        console.error('Error deleting ICS file:', error);
    }
}

module.exports = { generateICS, deleteICS };
