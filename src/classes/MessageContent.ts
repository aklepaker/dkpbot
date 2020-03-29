import { MessageEmbed, MessageAttachment } from "discord.js";
import { format, parse, getUnixTime } from "date-fns";
import { sortBy, orderBy } from "lodash";
import { parseString } from 'xml2js';
import fetch from 'node-fetch'
// import { puppeteer } from 'puppeteer';
import puppeteer = require('puppeteer');
import ToolTip from '../objects/ToolTip'
import * as fs from "fs";

export class MessageContent {
  private browser: any;
  private browserOptions: any;
  constructor() {
    //
    this.browserOptions = {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // <- this one doesn't works in Windows
        '--disable-gpu'
      ],
      headless: true
    }

  }

  private async CreateTooltipImage(id: number): Promise<string> {
    if (!fs.existsSync(`tmp/${id}.png`)) {
      /*
      Create headless browser
      */
      this.browser = await puppeteer.launch(this.browserOptions)
      const page = await this.browser.newPage()
      const document = page.document;

      /*
      Get tooltip, trigger it and wait for it to be loaded
      */
      await page.setContent(ToolTip(id.toString()))
      await page.hover("#tooltipref");
      await page.waitForSelector(".q4");
      await page.click("#tooltipref");

      /*
      Get correct dimensions
      */
      const rect = await page.evaluate(() => {
        const element = document.querySelectorAll("#size");
        const { x, y, width, height } = element[0].getBoundingClientRect();
        return {
          left: x,
          top: y,
          width,
          height,
          id: element.id
        };
      });

      /*
      Generate image
      */
      await page.screenshot({
        path: `tmp/${id}.png`,
        omitBackground: true,
        clip: {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height
        }
      });
      await this.browser.close()
    }

    return `tmp/${id}.png`;
  }

  private parseLootString(loot: string, removeBrackets = false): string {
    if (removeBrackets) {
      return loot.substring(loot.indexOf("[") + 1, loot.lastIndexOf("]"))
    }
    return loot.substring(loot.indexOf("["), loot.lastIndexOf("]") + 1)
  }
  /**
    Create embed reply message for player loot
  */
  public LootEmbed(items: any[]): MessageEmbed {
    if (items.length <= 0) {
      return null;
    }

    const embed = new MessageEmbed();

    const timeArray = [];
    const costArray = [];
    const itemArray = [];

    embed.type = "rich";
    embed.setTitle(`Loot history for ${items[0]?.player}`).setColor("#ffffff");
    embed.setTimestamp();

    items.forEach(item => {
      const lootItem = this.parseLootString(item.loot);

      const time = format(new Date(item.date * 1000), "dd.MM.yyyy");
      timeArray.unshift(time);
      itemArray.unshift(`${lootItem}`);
      costArray.unshift(item.cost.toString());
    });

    embed.addField("Item", itemArray, true);
    embed.addField("DKP", costArray, true);
    embed.addField("Date", timeArray, true);

    return embed;
  }

  /**
    Create embed reply message for search loot
  */
  public async SearchEmbed(items: any[], search: string): Promise<MessageEmbed> {
    if (items.length <= 0) {
      return null;
    }
    const embed = new MessageEmbed();
    embed.type = "rich";

    let thumbnailUrl = "";
    let wowheadItem: any = {};
    let tooltip = "";
    let itemId = 0;
    const playerArray = [];
    const timeArray = [];
    const costArray = [];
    const itemArray = [];

    /*
    Check if it's the same item for each entry
    */
    const isSameItem = items.every(i => this.parseLootString(i.loot) === this.parseLootString(items[0].loot));

    /*
    Parse a date only so we can sort on it
    */
    items.forEach(item => {
      item.parsedDate = getUnixTime(parse(format(new Date(item.date * 1000), "dd.MM.yyyy"), "dd.MM.yyyy", new Date()));
    })

    let sortedItems = sortBy(items, ["cost"]);

    if (isSameItem) {
      /*
      Sort by date, then by cost asc
      */
      sortedItems = orderBy(items, ["parsedDate", "cost"], ['asc', "desc"]);

      /*
      Fetch details from wowhead
      */
      const itemTmp = items[0].loot.substring(items[0].loot.indexOf(":") + 1);
      itemId = itemTmp.substring(0, itemTmp.indexOf(":"));
      const data = await fetch(`https://www.wowhead.com/item=${itemId}&xml`).then(res => { return res.text() });

      parseString(data, (err, res) => {
        wowheadItem = res.wowhead
      });

      thumbnailUrl = `https://wow.zamimg.com/images/wow/icons/medium/${wowheadItem?.item[0].icon[0]._}.jpg`

      /*
      Create tooltip image from wowhead tooltip
      */
      tooltip = await this.CreateTooltipImage(itemId);
    }

    sortedItems.forEach(item => {
      const lootItem = this.parseLootString(item.loot);
      const time = format(new Date(item.date * 1000), "dd.MM.yyyy");

      itemArray.unshift(`${lootItem}`);
      playerArray.unshift(item.player);
      timeArray.unshift(time);
      costArray.unshift(item.cost);
    });

    const titleText = isSameItem ? `Found ${items.length} player(s) with ${this.parseLootString(items[0].loot, true)}` : `Got ${items.length} result(s) searching for '${search}' `

    embed.setTimestamp();
    if (isSameItem) {

      embed.files = [];
      embed.files.push(new MessageAttachment(tooltip, `${itemId}.png`));
      embed.setAuthor(`${this.parseLootString(items[0].loot, true)}`, thumbnailUrl, wowheadItem?.item[0].link[0])
      embed.setTitle(titleText)
      embed.setColor("#a335ee");
      embed.setThumbnail(`attachment://${itemId}.png`);
      embed.setFooter("Item information from classic.wowhead.com", "https://wow.zamimg.com/images/logos/wh-logo-54.png")
      embed.addField("Player", playerArray, true);
      embed.addField("Cost", costArray, true);
      embed.addField("Date", timeArray, true);
    } else {
      embed.addField("Item", itemArray, true);
      embed.addField("Player", playerArray, true);
      embed.addField("Cost", costArray, true);
    }


    return embed;
  }

  /**
    Create embed reply message for raid loot
  */
  public ZoneEmbed(items: any[], search: string, zone: string): MessageEmbed {
    if (items.length <= 0) {
      return null;
    }
    const embed = new MessageEmbed();

    const playerArray = [];
    const costArray = [];
    const itemArray = [];

    zone = items[0].zone;

    embed.type = "rich";
    embed.setTitle(`There were ${items.length} item(s) distributed in ${zone} on ${search}`).setColor("#ffffff");
    embed.setTimestamp();

    items.forEach(item => {
      const lootItem = item.loot.substring(item.loot.indexOf("["), item.loot.lastIndexOf("]") + 1);
      const cost = item.cost;

      itemArray.unshift(`${lootItem}`);
      playerArray.unshift(item.player);
      costArray.unshift(cost);
    });

    embed.addField("Item", itemArray, true);
    embed.addField("Player", playerArray, true);
    embed.addField("DKP", costArray, true);
    embed.setFooter("Links has been removed due to discord message size restrictions\n");

    return embed;
  }

  /**
    Create embed reply message for players loot
  */
  public DKPStatusEmbed(items: any, search: string): MessageEmbed {
    const embed = new MessageEmbed();


    embed.setTitle(`Current DKP status for ${search}`).setColor("#ffffff");

    const playerArray = [];
    const dkpArray = [];
    const classArray = [];

    items = sortBy(items, ["dkp"]);

    items.forEach(item => {
      playerArray.unshift(item.player);
      dkpArray.unshift(item.dkp);
      classArray.unshift(item.class[0] + item.class.substring(1).toLocaleLowerCase());
    });

    embed.type = "rich";
    embed.addField("Player", playerArray, true);
    embed.addField("Class", classArray, true);
    embed.addField("DKP", dkpArray, true);

    embed.setTimestamp();

    return embed;
  }

  public CreateClassTalentsEmbed(items: any, search: string): MessageEmbed {
    const embed = new MessageEmbed();

    embed.setTitle(`Current talents for ${search}`).setColor("#ffffff");

    const playerArray = [];
    const specArray = [];
    const classArray = [];

    items = sortBy(items, ["player"]).reverse();

    items.forEach(item => {
      playerArray.unshift(item.player);
      specArray.unshift(item.spec);
      classArray.unshift(item.class[0] + item.class.substring(1).toLocaleLowerCase());
    });

    embed.type = "rich";
    embed.addField("Player", playerArray, true);
    embed.addField("Class", classArray, true);
    embed.addField("Spec", specArray, true);

    embed.setTimestamp();

    return embed;
  }
}
