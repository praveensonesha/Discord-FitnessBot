const { collectUserDetails } = require('../forms/userDetailsForm');
const axios = require('axios');

const handleNewMemberEvent = async (member) => {
    console.log(`New member joined: ${member.user.tag} (ID: ${member.id})`);
    console.log(`Server: ${member.guild.name} (ID: ${member.guild.id})`);
    //add to users
    const newUser = {
      user_id: member.id,
      username: member.user.username,
    };
    try {
         await axios.post('http://localhost:3000/users/addUser', newUser);
      } catch (error) {
        console.error('Error sending user details to server:', error);
      }



    // Send a DM to the new member
    try {
      const dmChannel = await member.createDM();
      dmChannel.send('Welcome to our server! Let\'s start with some basic information.');

      collectUserDetails(member.user, dmChannel, async (details) => {
        try {
          const response = await axios.post('http://localhost:3000/users/userDetails', details);
          if (response.status === 200) {
            dmChannel.send("Your details have been successfully saved!");
          } else {
            dmChannel.send("There was an issue saving your details. Please try again later.");
          }
        } catch (error) {
          console.error('Error sending user details to server:', error);
          dmChannel.send("There was an error saving your details. Please try again later.");
        }
      });
    } catch (error) {
      console.error('Error sending DM to new member:', error);
    }
//   } else {
    // console.error('Welcome channel not found.');
//   }
};

module.exports = { handleNewMemberEvent };