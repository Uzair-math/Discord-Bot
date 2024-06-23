import { Client } from 'discord.js-selfbot-v13';
import puppeteer from 'puppeteer';

const client = new Client();
const channelId = 'discord-channel-ID';

function parseMessageContent(content) {
  const parts = content.split(' - ');
  return {
    productName: parts[0].trim(),
    price: parseFloat(parts[1].replace(/[^\d.-]/g, ''))
  };
}

async function searchEbay(query) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query.productName)}`);

  const results = await page.evaluate(() => {
    const listings = Array.from(document.querySelectorAll('.s-item'));
    return listings.map(listing => ({
      title: listing.querySelector('.s-item__title')?.innerText,
      price: listing.querySelector('.s-item__price')?.innerText,
      link: listing.querySelector('.s-item__link')?.href
    }));
  });

  await browser.close();
  return results;
}

async function searchVinted(query) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(`https://www.vinted.com/catalog?search_text=${encodeURIComponent(query.productName)}`);
  
  const results = await page.evaluate(() => {
    const listings = Array.from(document.querySelectorAll('.item-box'));
    return listings.map(listing => ({
      title: listing.querySelector('.item-box-title')?.innerText,
      price: listing.querySelector('.item-box-price')?.innerText,
      link: listing.querySelector('.item-box-link')?.href
    }));
  });

  await browser.close();
  return results;
}

async function searchKleinanzeigen(query) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(`https://www.ebay-kleinanzeigen.de/s-suchanfrage.html?keywords=${encodeURIComponent(query.productName)}`);

  const results = await page.evaluate(() => {
    const listings = Array.from(document.querySelectorAll('.ad-listitem'));
    return listings.map(listing => ({
      title: listing.querySelector('.text-module-begin')?.innerText,
      price: listing.querySelector('.aditem-main--middle--price')?.innerText,
      link: listing.querySelector('a')?.href
    }));
  });

  await browser.close();
  return results;
}

function formatResults(results) {
  return results.map(result => `${result.title}\n${result.price}\n${result.link}`).join('\n\n');
}

// notification

async function sendDiscordNotification(channel, notification) {
  await channel.send(notification);
}

// Monitor Discord channel 

client.on('messageCreate', async (message) => {
  if (message.channel.id === 'channel-ID') {
    const query = parseMessageContent(message.content);

    const ebayResults = await searchEbay(query);
    const vintedResults = await searchVinted(query);
    const kleinanzeigenResults = await searchKleinanzeigen(query);

    const results = [...ebayResults, ...vintedResults, ...kleinanzeigenResults];

    if (results.length > 0) {
      const notification = formatResults(results);
      const notificationChannel = await client.channels.fetch(channelId);
      await sendDiscordNotification(notificationChannel, notification);
    }
  }
});

client.login('discord-user-doken');

