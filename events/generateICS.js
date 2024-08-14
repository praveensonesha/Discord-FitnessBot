const ics = require('ics');
const fs = require('fs');
const path = require('path');

async function generateICS(planType, user, content) {
    try {
        const events = [];
        const exampleEvent = {
            start: [2024, 8, 13, 9, 0],
            duration: { hours: 1 },
            title: `Your ${planType} Plan`,
            description: content,
        };
        events.push(exampleEvent);

        const { error, value } = ics.createEvents(events);

        if (error) {
            console.error('Error creating ICS file:', error);
            return;
        }

        const fileName = `user_${user.user_id}_${planType}_plan.ics`;
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

module.exports = { generateICS };
