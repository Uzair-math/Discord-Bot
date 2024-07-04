const { Client, GatewayIntentBits, InteractionType } = require("discord.js");
const axios = require('axios');
const cheerio = require('cheerio');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

async function searchEbay(query) {
  const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
  
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    let listings = [];

    $('.s-item').each((i, element) => {
      const title = $(element).find('.s-item__title').text().trim();
      const link = $(element).find('.s-item__link').attr('href');
      listings.push({ title, link });
    });

    return listings;
  } catch (error) {
    console.error('Error fetching eBay results:', error);
    return [];
  }
}

async function searchVinted(query) {
  const url = `https://www.vinted.com/catalog?search_text=${encodeURIComponent(query)}`;
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    let listings = [];

    $('.catalog-item').each((i, element) => {
      const title = $(element).find('.catalog-item__title').text().trim();
      const link = $(element).find('a').attr('href');
      listings.push({ title, link: `https://www.vinted.com${link}` });
    });

    return listings;
  } catch (error) {
    console.error('Error fetching Vinted results:', error);
    return [];
  }
}

async function searchKleinanzeigen(query) {
  const url = `https://www.kleinanzeigen.de/s-suchanfrage.html?keywords=${encodeURIComponent(query)}`;
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    let listings = [];

    $('.aditem').each((i, element) => {
      const title = $(element).find('.aditem-main--title').text().trim();
      const link = $(element).find('.aditem-main--title a').attr('href');
      listings.push({ title, link: `https://www.kleinanzeigen.de${link}` });
    });

    return listings;
  } catch (error) {
    console.error('Error fetching Kleinanzeigen results:', error);
    return [];
  }
}
async function sendNotification(message) {
  const webhookURL = 'webhook URL';
  try {
    await axios.post(webhookURL, { content: message });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  console.log(`Received message: ${message.content}`); 

  if (message.content.startsWith("search")) {
    const query = message.content.split("search")[1].trim();
    console.log(`Search query: ${query}`); 

    const ebayResults = await searchEbay(query);
    console.log(`eBay results: ${JSON.stringify(ebayResults)}`); 
    const vintedResults = await searchVinted(query);
    console.log(`Vinted results: ${JSON.stringify(vintedResults)}`); 
    const kleinanzeigenResults = await searchKleinanzeigen(query);
    console.log(`Kleinanzeigen results: ${JSON.stringify(kleinanzeigenResults)}`); 

    let results = [];
    results = results.concat(ebayResults, vintedResults, kleinanzeigenResults);

    let notificationMessage = `Search results for "${query}":\n`;
    results.forEach(result => {
      notificationMessage += `${result.title} - ${result.link}\n`;
    });

    await sendNotification(notificationMessage);
    message.reply("Search completed. Notification sent.");
  }
});

client.on("interactionCreate", (interaction) => {
  if (interaction.type === InteractionType.ApplicationCommand) {
    interaction.reply("pong!!");
  }
});

client.login("token");





