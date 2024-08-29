const ics = require('ics');
const fs = require('fs').promises;
const path = require('path');

// Create a directory for temporary files if it doesn't exist
async function ensureTempDirExists() {
    const tempDir = path.join(__dirname, 'temp');
    try {
        await fs.access(tempDir);
    } catch {
        await fs.mkdir(tempDir);
    }
}

async function generateICS(user) {
    try {
        await ensureTempDirExists(); // Ensure temp directory exists

        const events = [];

        if (user.workoutPlanContent) {
            const workoutEvents = parsePlanToEvents(user.workoutPlanContent, 'Workout');
            events.push(...workoutEvents);
        }

        if (user.nutritionPlanContent) {
            const nutritionEvents = parsePlanToEvents(user.nutritionPlanContent, 'Nutrition');
            events.push(...nutritionEvents);
        }

        const { error, value } = ics.createEvents(events);

        if (error) {
            console.error('Error creating ICS file:', error);
            throw new Error('Failed to create ICS file');
        }

        const fileName = `user_${user.user_id}_fitness_plan.ics`;
        const filePath = path.join(__dirname, 'temp', fileName);
        await fs.writeFile(filePath, value);

        console.log(`ICS file generated: ${filePath}`);
        return filePath;
    } catch (error) {
        console.error('Error generating ICS file:', error);
        throw new Error('Failed to generate ICS file');
    }
}

async function deleteICS(filePath) {
    try {
        await fs.unlink(filePath);
        console.log(`ICS file deleted: ${filePath}`);
    } catch (error) {
        console.error('Error deleting ICS file:', error);
    }
}

function parsePlanToEvents(plan, type) {
    const events = [];
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const lines = plan.split('\n');
    
    let currentDay = '';
    let currentTime = '';
    let currentDescription = '';
    
    lines.forEach(line => {
        line = line.trim();
        
        // Check if line is a day
        if (daysOfWeek.includes(line.split(':')[0])) {
            currentDay = line.split(':')[0];
            return;
        }

        // Extract time and description
        const timeMatch = line.match(/(\d{1,2}:\d{2} [APM]{2})/);
        if (timeMatch) {
            currentTime = timeMatch[0];
            currentDescription = line.replace(timeMatch[0], '').trim();
            return;
        }

        // If there's a valid time and description, create an event
        if (currentTime && currentDescription) {
            const [hour, minute] = parseTime(currentTime);
            const dayIndex = daysOfWeek.indexOf(currentDay);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() + ((dayIndex + 1 - startDate.getDay() + 7) % 7)); // Calculate the correct date
            
            const event = {
                start: [startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate(), hour, minute],
                duration: { hours: 1 }, // Adjust as needed
                title: `${type} Plan - ${currentDay}`,
                description: currentDescription,
                location: 'Home', // Example location
                status: 'CONFIRMED',
                busyStatus: 'BUSY',
                organizer: { name: 'Fitness Bot', email: 'bot@example.com' }
            };
            events.push(event);
        }
    });

    return events;
}

function parseTime(timeStr) {
    const [time, modifier] = timeStr.split(' ');
    let [hour, minute] = time.split(':').map(Number);

    if (modifier === 'PM' && hour !== 12) hour += 12;
    if (modifier === 'AM' && hour === 12) hour = 0;

    return [hour, minute];
}

module.exports = { generateICS, deleteICS };
