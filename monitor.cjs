import { Client } from 'discord.js-selfbot-v13';
import puppeteer from 'puppeteer';
import nodemailer from 'nodemailer';

const client = new Client();
const channelId = 'discord-channel-ID';
const emailRecipient = 'muhammad@example.com';
const priceDifferenceThreshold = 5;

function parseMessageContent(content) {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  const productName = lines[0];
  const sizesAndPrices = lines.slice(1).map(line => {
    const [size, price] = line.split(' €');
    return { size: size.trim(), price: parseFloat(price.trim()) };
  });
  return { productName, sizesAndPrices };
}

async function searchEbay(query) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query.productName)}`);

  const results = await page.evaluate(() => {
    const listings = Array.from(document.querySelectorAll('.s-item'));
    return listings.map(listing => ({
      title: listing.querySelector('.s-item__title')?.innerText || 'No title',
      price: parseFloat((listing.querySelector('.s-item__price')?.innerText.replace(/[^\d.-]/g, '') || '0').replace(',', '.')),
      link: listing.querySelector('.s-item__link')?.href || 'No link'
    }));
  });

  await browser.close();
  return results;
}

async function searchVinted(query) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`https://www.vinted.com/catalog?search_text=${encodeURIComponent(query.productName)}`);

  const results = await page.evaluate(() => {
    const listings = Array.from(document.querySelectorAll('.item-box'));
    return listings.map(listing => ({
      title: listing.querySelector('.item-box-title')?.innerText || 'No title',
      price: parseFloat((listing.querySelector('.item-box-price')?.innerText.replace(/[^\d.-]/g, '') || '0').replace(',', '.')),
      link: listing.querySelector('.item-box-link')?.href || 'No link'
    }));
  });

  await browser.close();
  return results;
}

async function searchKleinanzeigen(query) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`https://www.ebay-kleinanzeigen.de/s-suchanfrage.html?keywords=${encodeURIComponent(query.productName)}`);

  const results = await page.evaluate(() => {
    const listings = Array.from(document.querySelectorAll('.ad-listitem'));
    return listings.map(listing => ({
      title: listing.querySelector('.text-module-begin')?.innerText || 'No title',
      price: parseFloat((listing.querySelector('.aditem-main--middle--price')?.innerText.replace(/[^\d.-]/g, '') || '0').replace(',', '.')),
      link: listing.querySelector('a')?.href || 'No link'
    }));
  });

  await browser.close();
  return results;
}

function formatResults(results) {
  return results.map(result => `${result.title}\n${result.price} €\n${result.link}`).join('\n\n');
}

async function sendEmailNotification(subject, text) {
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'email@gmail.com', 
      pass: 'email-password' 
    }
  });

  let mailOptions = {
    from: 'email@gmail.com',
    to: emailRecipient,
    subject: subject,
    text: text
  };

  await transporter.sendMail(mailOptions);
}

client.on('messageCreate', async (message) => {
  if (message.channel.id === channelId) {
    const { productName, sizesAndPrices } = parseMessageContent(message.content);

    for (const { size, price } of sizesAndPrices) {
      const query = { productName: `${productName} ${size}`, price };

      const ebayResults = await searchEbay(query);
      const vintedResults = await searchVinted(query);
      const kleinanzeigenResults = await searchKleinanzeigen(query);

      const allResults = [...ebayResults, ...vintedResults, ...kleinanzeigenResults];

      const filteredResults = allResults.filter(result => result.price < (price - priceDifferenceThreshold));

      if (filteredResults.length > 0) {
        const notification = formatResults(filteredResults);
        const subject = `Price Drop Alert: ${productName} ${size}`;
        await sendEmailNotification(subject, notification);
      }
    }
  }
});

client.login('discord token');
