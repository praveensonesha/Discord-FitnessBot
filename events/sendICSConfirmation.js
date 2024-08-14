const { generateICS, deleteICS } = require('../events/generateICS');

async function sendICSConfirmation(user, client, dmChannel) {
    try {
        const message = await dmChannel.send("Would you like to download an ICS file that includes both your workout and nutrition plans? Reply with 'yes' or 'no'.");

        const filter = response => {
            return response.author.id === user.user_id && ['yes', 'no'].includes(response.content.toLowerCase());
        };

        const collected = await dmChannel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });

        if (collected.size > 0) {
            const answer = collected.first().content.toLowerCase();

            if (answer === 'yes') {
                const filePath = await generateICS(user);
                if (filePath) {
                    await dmChannel.send({ files: [filePath] });

                    // Delete the file after sending
                    deleteICS(filePath);
                } else {
                    await dmChannel.send("Failed to generate ICS file.");
                }
            } else {
                await dmChannel.send("No problem! Let me know if you need anything else.");
            }
        } else {
            await dmChannel.send("No response received. Please try again.");
        }

    } catch (error) {
        console.error('Error handling ICS confirmation:', error);
        await dmChannel.send("There was an error while processing your request. Please try again later.");
    }
}

module.exports = { sendICSConfirmation };
