import { MessageEmbed } from "discord.js";
import { format } from "date-fns";
import { sortBy } from "lodash";

export class MessageContent {
  constructor() {
    //
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
      const lootItem = item.loot.substring(item.loot.indexOf("["), item.loot.lastIndexOf("]") + 1);

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
  public SearchEmbed(items: any[], search: string): MessageEmbed {
    if (items.length <= 0) {
      return null;
    }
    const embed = new MessageEmbed();

    const playerArray = [];
    const timeArray = [];
    const costArray = [];
    const itemArray = [];

    const sortedItems = sortBy(items, ["cost"]);
    sortedItems.reverse().forEach(item => {
      const lootItem = item.loot.substring(item.loot.indexOf("["), item.loot.lastIndexOf("]") + 1);
      const time = format(new Date(item.date * 1000), "dd.MM.yyyy");

      itemArray.unshift(`${lootItem}`);
      playerArray.unshift(item.player);
      timeArray.unshift(time);
      costArray.unshift(item.cost);
    });

    const isAllTheSame = itemArray.every(i => i === itemArray[0]);
    embed.type = "rich";
    const titleText = isAllTheSame ? `Found ${items.length} entries(s) for ${itemArray[0]} ` : `Got ${items.length} result(s) searching for '${search}' `
    embed.setTitle(titleText).setColor("#ffffff");
    embed.setTimestamp();
    if (isAllTheSame) {
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
