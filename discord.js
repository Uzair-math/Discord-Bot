const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const discordToken = 'token';
const monitoredChannelId = 'channel ID';

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
  if (message.channel.id === monitoredChannelId) {
    const searchTerm = message.content.trim();
    const [ebayResults, vintedResults, kleinanzeigenResults] = await Promise.all([
      searchEbay(searchTerm),
      searchVinted(searchTerm),
      searchKleinanzeigen(searchTerm)
    ]);
    const availableOn = [];
    if (ebayResults.length > 0) availableOn.push('eBay');
    if (vintedResults.length > 0) availableOn.push('Vinted');
    if (kleinanzeigenResults.length > 0) availableOn.push('Kleinanzeigen');

    if (availableOn.length > 0) {
      notifyDiscord(searchTerm, availableOn);
    }
  }
});

async function searchEbay(query) {
  try {
    const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const results = [];
    $('.s-item__title').each((index, element) => {
      const title = $(element).text();
      if (title.toLowerCase().includes(query.toLowerCase())) {
        results.push({ title });
      }
    });

    return results;
  } catch (error) {
    console.error('Error searching eBay:', error);
    return [];
  }
}

async function searchVinted(query) {
  try {
    const url = `https://www.vinted.com/catalog?search_text=${encodeURIComponent(query)}`;
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const results = [];
    $('.item__title').each((index, element) => {
      const title = $(element).text();
      if (title.toLowerCase().includes(query.toLowerCase())) {
        results.push({ title });
      }
    });

    return results;
  } catch (error) {
    console.error('Error searching Vinted:', error);
    return [];
  }
}

async function searchKleinanzeigen(query) {
  try {
    const url = `https://www.ebay-kleinanzeigen.de/s-suchanfrage.html?keywords=${encodeURIComponent(query)}`;
    const response = await axios.get(url);
    const html = response.data;

    if (html.toLowerCase().includes(query.toLowerCase())) {
      return [{ message: `The term "${query}" is available on Kleinanzeigen` }];
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error searching Kleinanzeigen APP Muhammad:', error);
    return [];
  }
}

function notifyDiscord(searchTerm, websites) {
  const message = `The term "${searchTerm}" is available on : ${websites.join(', ')}.`;

  client.channels.cache.get(monitoredChannelId).send(message);
}

client.login(discordToken);
