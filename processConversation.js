require('dotenv').config();
const { ConversationManager } = require('./conversationManager');
const { Client, GatewayIntentBits, ChannelType, Events, ActivityType, GuildMessageManager ,AttachmentBuilder} = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { config } = require('./config');
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const conversationManager = new ConversationManager();
const { PDFDocument, rgb ,StandardFonts} = require('pdf-lib');
const fs = require('fs');
const FormData = require('form-data');


async function sendPDFToDiscord(filePath, channelId, token) {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
  
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${token}`,
        ...form.getHeaders(),
      },
      body: form,
    });
  
    const result = await response.json();
    console.log('PDF sent to Discord:', result);
  }

function parseText(text) {
    const elements = [];
    const lines = text.split('\n');
  
    lines.forEach(line => {
      if (line.startsWith('## ')) {
        // Heading
        elements.push([{ text: line.substring(3), style: 'heading' }]);
      } else if (line.startsWith('* ')) {
        // List item
        elements.push([{ text: line.substring(2), style: 'list' }]);
      } else {
        const parts = [];
        let remaining = line;
  
        while (remaining) {
          // Match bold text
          const boldMatch = remaining.match(/^\*\*(.*?)\*\*/);
          if (boldMatch) {
            if (parts.length) parts.push({ text: remaining.substring(0, boldMatch.index) });
            parts.push({ text: boldMatch[1], style: 'bold' });
            remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
          } else {
            // Match italic text
            const italicMatch = remaining.match(/^\*(.*?)\*/);
            if (italicMatch) {
              if (parts.length) parts.push({ text: remaining.substring(0, italicMatch.index) });
              parts.push({ text: italicMatch[1], style: 'italic' });
              remaining = remaining.substring(italicMatch.index + italicMatch[0].length);
            } else {
              // If no match, add the remaining text
              parts.push({ text: remaining });
              remaining = '';
            }
          }
        }
  
        elements.push(parts);
      }
    });
  
    return elements;
  }
  
  
  
  /**
   * Creates a styled PDF with the provided content.
   * @param {string} content - The text content to be included in the PDF.
   */
  async function createPDF(content) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
  
    // Get standard fonts
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
    const { height } = page.getSize();
    let yPosition = height - 50; // Starting Y position
  
    // Parse and add content to the PDF
    const elements = parseText(content);
    elements.forEach(parts => {
      parts.forEach(part => {
        if (part.style === 'bold') {
          page.drawText(part.text, {
            x: 50,
            y: yPosition,
            size: 12,
            font: fontBold,
            color: rgb(0, 0, 0),
          });
        } else {
          page.drawText(part.text, {
            x: 50,
            y: yPosition,
            size: 12,
            font: fontRegular,
            color: rgb(0, 0, 0),
          });
        }
        yPosition -= 15; // Adjust Y position for the next line
      });
      yPosition -= 20; // Extra space between paragraphs
    });
  
    // Serialize the PDF document to bytes
    const pdfBytes = await pdfDoc.save();
  
    // Write the PDF file to the filesystem
    fs.writeFileSync('response.pdf', pdfBytes);
  
    return 'response.pdf';
  }

const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
});

// Function to trim text to a maximum of 1700 words
function trimTo1700Words(text) {
    const words = text.split(/\s+/); // Split by whitespace
    if (words.length > 1700) {
        return words.slice(0, 1700).join(' '); // Trim and join back to a string
    }
    return text;
}

// Function to split text into chunks of a specific maximum length
function splitIntoChunks(text, maxLength) {
    const chunks = [];
    while (text.length > maxLength) {
        let chunk = text.slice(0, maxLength);
        let lastSpaceIndex = chunk.lastIndexOf(' ');
        if (lastSpaceIndex > -1) {
            chunk = text.slice(0, lastSpaceIndex);
            text = text.slice(lastSpaceIndex + 1);
        } else {
            text = text.slice(maxLength);
        }
        chunks.push(chunk);
    }
    if (text.length > 0) {
        chunks.push(text);
    }
    return chunks;
}

async function processConversation({ message, messageContent, analyze }) {
  try {
      console.log("Processing conversation with analyze flag:", analyze);

      const typingInterval = 2000;
      let typingIntervalId;

      const startTyping = async () => {
          typingIntervalId = setInterval(() => {
              if (message.channel.sendTyping) {
                  message.channel.sendTyping();
              }
          }, typingInterval);
      };

      const stopTyping = () => {
          clearInterval(typingIntervalId);
      };

      await startTyping();

      const safeReply = async (content) => {
          if (message.deferReply && !message.deferred && !message.replied) {
              try {
                  await message.deferReply({ ephemeral: true });
              } catch (error) {
                  if (error.code !== 'InteractionAlreadyReplied') {
                      throw error;
                  }
              }
          } else if (message.editReply) {
              await message.editReply(content);
          } else {
              await message.reply(content);
          }
      };

      if (analyze) {
          if (message.deferReply && !message.deferred && !message.replied) {
              try {
                  await message.deferReply({ ephemeral: true });
              } catch (error) {
                  if (error.code !== 'InteractionAlreadyReplied') {
                      throw error;
                  }
              }
          }

          console.log('Starting analysis with message content length:', messageContent.length);

          const model = await genAI.getGenerativeModel({ model: config.modelName });
          const chat = model.startChat({
              safetySettings: config.safetySettings,
          });

          const result = await chat.sendMessage(messageContent);
          let finalResponse = result.response.text();
          console.log("Received response length:", finalResponse.length);

          finalResponse = trimTo1700Words(finalResponse);
          console.log("Trimmed response length:", finalResponse.length);

          const chunks = splitIntoChunks(finalResponse, 1000);
          console.log("Chunks generated:", chunks.length);

          finalResponse = "";

          for (const chunk of chunks) {
              finalResponse += chunk;
              await safeReply({ content: finalResponse });
              await new Promise(resolve => setTimeout(resolve, 1000));
          }

          const pdfPath = await createPDF(finalResponse);
          console.log('PDF created:', pdfPath);

          const attachment = new AttachmentBuilder(fs.readFileSync(pdfPath), { name: 'response.pdf' });

          await message.user.send({
              content: "Here's your report:",
              files: [attachment]
          });

          console.log('PDF sent to Discord.');

          await stopTyping();
      } else {
          const model = await genAI.getGenerativeModel({ model: config.modelName });
          const chat = model.startChat({
              history: conversationManager.getHistory(message.author.id),
              safetySettings: config.safetySettings,
          });

          let responseText = '';

          if (message.deferReply && !message.deferred && !message.replied) {
              try {
                  await message.deferReply();
              } catch (error) {
                  if (error.code !== 'InteractionAlreadyReplied') {
                      throw error;
                  }
              }
          }

          const response = await chat.sendMessage(messageContent);
          responseText = response.response.text();

          await safeReply(responseText);

          await stopTyping();
      }
  } catch (error) {
      console.error('Error processing the conversation:', error);
      await safeReply('Sorry, something went wrong!');
  }
}

module.exports = processConversation;


module.exports = processConversation;



module.exports = processConversation;
