import { format } from "date-fns";
import { Client, Guild, Message, MessageEmbed } from "discord.js";
import * as https from "https";
import { sortBy } from "lodash";
import { Parser } from "./parser";

export class Bot {
  private client: Client;
  private readonly token: string;
  private parser: Parser;
  private dkp: object[] = [];

  constructor() {
    this.client = new Client();
    this.token = process.env.TOKEN;
    this.parser = new Parser("dkp.lua");
  }

  private Init = async (): Promise<void> => {
    this.client.guilds.cache.forEach(async (guild: Guild) => {
      try {
        this.dkp[guild.id] = await this.parser.Parse(guild.id);
      } catch (error) {
        this.dkp[guild.id] = {};
      }
    });
  };

  private createLootEmbed = (items: any[]): MessageEmbed => {
    console.log(items.length);
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

      // lootItem
      const lootItemIdTemp = item.loot.substring(item.loot.indexOf("Hitem:") + 6);
      const lootItemId = lootItemIdTemp.substring(0, lootItemIdTemp.indexOf(":"));

      const time = format(new Date(item.date * 1000), "dd.MM.yyyy");
      timeArray.unshift(time);
      itemArray.unshift(`${lootItem}(https://classic.wowhead.com/item=${lootItemId})`);
      costArray.unshift(item.cost.toString());
    });

    embed.addField("Item", itemArray, true);
    embed.addField("DKP", costArray, true);
    embed.addField("Date", timeArray, true);

    return embed;
  };

  private createSearchEmbed = (items: any[], search: string): MessageEmbed => {
    if (items.length <= 0) {
      return null;
    }
    const embed = new MessageEmbed();

    const playerArray = [];
    const timeArray = [];
    const itemArray = [];

    embed.type = "rich";
    embed.setTitle(`Got ${items.length} result(s) searching for '${search}' `).setColor("#ffffff");
    embed.setTimestamp();

    items.forEach(item => {
      const lootItem = item.loot.substring(item.loot.indexOf("["), item.loot.lastIndexOf("]") + 1);

      // lootItem
      const lootItemIdTemp = item.loot.substring(item.loot.indexOf("Hitem:") + 6);
      const lootItemId = lootItemIdTemp.substring(0, lootItemIdTemp.indexOf(":"));
      const time = format(new Date(item.date * 1000), "dd.MM.yyyy");

      itemArray.unshift(`${lootItem}(https://classic.wowhead.com/item=${lootItemId})`);
      playerArray.unshift(item.player);
      timeArray.unshift(time);
    });

    embed.addField("Item", itemArray, true);
    embed.addField("Player", playerArray, true);
    embed.addField("Date", timeArray, true);

    return embed;
  };

  //console.log(`${item.player} - ${item.dkp}dkp`);
  lootObjects = [];
  private createDKPStatus = (items: any, search: string): MessageEmbed => {
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
  };

  public listen(): Promise<string> {
    this.client.on("ready", () => {
      this.client.user.setActivity({ type: "LISTENING", name: `!dkp help` });
      this.Init();
    });

    this.client.on("guildCreate", (guild: Guild) => {
      console.log(`Joined ${guild.name}`);
    });

    this.client.on("message", async (message: Message) => {
      if (message.content.startsWith("!dkp")) {
        const params = message.content.split(" ");
        const guildId = message.guild.id;
        const guild = this.client.guilds.cache.find(g => g.id === guildId);

        if (this.dkp[guildId] === undefined && params[1] !== "update" && params[1] !== "help") {
          message.channel.send(`${guild.name} has no DKP data yet. Upload a Monolith DKP file with !dkp update`);
          return;
        }

        if (params.length >= 3) {
          switch (params[1]) {
            case "search":
              {
                this.ShowSearch(params, message);
              }
              break;
            case "loot":
              {
                this.ShowPlayerLoot(params, message);
              }
              break;
            case "class": {
              this.ShowClassDKP(params, message);
            }
          }
        } else {
          switch (params[1]) {
            case "all":
              {
                this.ShowAllUsersDKP(params, message);
              }
              break;

            case "update":
              {
                await this.UpdateDKPData(message);
              }
              break;

            case "help":
              {
                await this.ShowDKPHelp(message);
              }
              break;
            default: {
              this.ShowUserDKP(params, message);
            }
          }
        }
      }
    });

    return this.client.login(this.token);
  }

  private ShowSearch(params: string[], message: Message): void {
    const guildId = message.guild.id;
    const searchItem = params
      .splice(2)
      .join(" ")
      .toLocaleLowerCase();
    const items = [];
    this.dkp[guildId]["MonDKP_Loot"].forEach(item => {
      if (item.loot.toLocaleLowerCase().indexOf(searchItem) > -1) {
        items.unshift(item);
      }
    });
    message.channel.send(this.createSearchEmbed(items, searchItem));
  }

  private ShowPlayerLoot(params: string[], message: Message): void {
    const guildId = message.guild.id;
    const searchItem = params[2];
    const items = [];

    this.dkp[guildId]["MonDKP_Loot"].forEach(item => {
      if (item.player.toLocaleLowerCase() == searchItem.toLocaleLowerCase()) {
        items.unshift(item);
      }
    });
    message.channel.send(this.createLootEmbed(items));
  }

  private ShowClassDKP(params: string[], message: Message): void {
    const guildId = message.guild.id;
    const searchItem = params[2];
    const items = [];
    this.dkp[guildId]["MonDKP_DKPTable"].forEach(item => {
      if (item.class.toLocaleLowerCase() == params[2].toLocaleLowerCase()) {
        items.unshift(item);
      }
    });
    message.channel.send(this.createDKPStatus(items, searchItem));
  }

  private ShowUserDKP(params: string[], message: Message): void {
    const guildId = message.guild.id;
    this.dkp[guildId]["MonDKP_DKPTable"].forEach(item => {
      if (item.player.toLocaleLowerCase() == params[1].toLocaleLowerCase()) {
        const items = [];
        items.push(item);
        message.channel.send(this.createDKPStatus(items, params[1]));
      }
    });
  }

  private ShowAllUsersDKP(params: string[], message: Message): void {
    const guildId = message.guild.id;
    const searchItem = params[2];
    const items = [];
    this.dkp[guildId]["MonDKP_DKPTable"].forEach(item => {
      items.unshift(item);
    });
    message.channel.send(this.createDKPStatus(items, searchItem));
  }

  private ShowDKPHelp(message: Message): void {
    const embed = new MessageEmbed();

    const serversJoined = this.client.guilds.cache.size;
    // const guildId = message.guild.id;
    const botName = this.client.user.username;
    // const guildName = this.client.guilds.cache.find(g => g.id === guildId);

    embed.type = "rich";
    embed.setTitle(`${botName} - Help`).setColor("#ffffff");
    embed.setImage(
      "https://icon-library.net/images/discord-transparent-server-icon/discord-transparent-server-icon-16.jpg"
    );
    embed.setThumbnail(
      "https://icon-library.net/images/discord-transparent-server-icon/discord-transparent-server-icon-16.jpg"
    );
    embed.setDescription(`Check your DKP status, or search who got that shiny item in the last raid.`);
    // embed.setDescription("!help");
    embed.addField("!dkp help", "Show this screen");
    embed.addField("!dkp search <item>", "Search all loots for the given item");
    embed.addField("!dkp <user> | all", "Show current DKP status for the given user, or all users");
    embed.addField("!dkp loot <user>", "Show all items a user have looted");
    embed.addField("!dkp class <class>", "Show DKP status for a given class");
    embed.addField("!dkp update", "Update the DKP table from a new file");
    embed.setFooter(`Currently serving ${serversJoined} servers`);
    embed.setTimestamp();

    message.channel.send(embed);
  }

  private async UpdateDKPData(message: Message): Promise<void> {
    const isCorrectRole = message.member.roles.cache.some(r => r.name === "DkpBotAdmin");
    const guildId = message.guild.id;

    if (isCorrectRole) {
      const responseMsg = await message.channel.send("Send you file MonolithDKP.lua from World Of Warcraft folder.");
      const filter = (m: Message): boolean => {
        return m.author == message.author;
      };

      message.channel.awaitMessages(filter, { max: 1 }).then(async msg => {
        const url = msg.first().attachments.first().url;
        https.get(url, async response => {
          responseMsg.edit("Parsing file");
          let buffer = "";
          response
            .on("data", function(d) {
              buffer += d;
            })
            .on("end", async () => {
              if (buffer) {
                try {
                  const content = await this.parser.ParseData(buffer);
                  this.dkp[guildId] = content;
                  this.parser.SaveFile(buffer, guildId);
                  responseMsg.edit("Updated");
                } catch (error) {
                  responseMsg.edit(`Failed parsing with ${error}`);
                }
                msg.first().delete();
              } else {
                responseMsg.edit(`No content in file`);
              }
            })
            .setEncoding("utf8");
        });
      });
    }
  }
}
