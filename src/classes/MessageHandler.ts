import { Client, Message } from "discord.js";
import { performance } from 'perf_hooks';
import { DMConfigSession, DMConfigSessionObject } from "../objects/DMConfigSession";
import { BotGuild } from "./BotGuild";
import { MessageReply } from "./MessageReply";
import { Metrics } from "./Metrics";


export class MessageHandler {
  private triggerWord: string;
  private action: string;
  private parameter: string;
  private rawParams: string[];
  private messageType: string;
  private message: Message;
  private botGuild: BotGuild;
  private client: Client;
  private dmSession: DMConfigSession;
  private metrics: Metrics;

  constructor(message: Message, client: Client, metrics: Metrics) {
    this.client = client;
    this.message = message;
    this.messageType = message.channel.type;
    this.botGuild = new BotGuild();
    this.ParseParams(message);
    this.metrics = metrics;

  }

  private async ParseParams(message: Message): Promise<void> {
    const params = message.content.split(" ");
    this.rawParams = params;

    switch (this.messageType) {
      case "dm":
        this.action = params[1];
        this.parameter = params.slice(2).join(" ");
        break;

      case "text":
        this.triggerWord = params[0];
        if (params.length >= 3) {
          this.action = params[1];
          this.parameter = params.slice(2).join(" ");
          return;
        }

        if (params.length === 2) {
          this.action = params[1];
          this.parameter = null;
        }
        break;
    }
  }

  public async ParseMessage(): Promise<void> {


    // this.ParseMessage(message);
    const pStart = performance.now();

    // skip messages from myself
    if (this.message.author.bot || this.message.author.id === this.message.client.user.id) {
      return;
    }

    /*
    Check if the this.message starts with a trigger, and are executed from a channel
    */
    let reply: MessageReply = null;

    if (this.IsMessageFromGuild()) {
      await this.botGuild.LoadFromId(this.message.guild.id);
      reply = new MessageReply(this.message, null, this.botGuild);
    }

    if (this.IsDirectMessage()) {
      this.metrics.MessagesReceivedCounter.inc(1);
      this.dmSession = await this.GetDMConfigSession(this.message.channel.id);
      await this.botGuild.LoadFromId(this.dmSession.guildId);
      reply = new MessageReply(this.message, this.dmSession, this.botGuild);

      if (this.dmSession === null) {
        return;
      }
    }

    if (!this.ShouldMessageBeParsed()) {
      return;
    }

    // if (this.IsDirectMessage() && (!this.dmSession?.guildId || !this.IsAdmin())) {
    //   reply.ShowNoConfigInitiated();
    //   return;
    // }
    /*
    Don't reply to our own this.messages
    */

    this.metrics.MessagesReceivedCounter.inc(1);

    switch (this.action) {
      case "search":
        {
          reply.ShowSearch();
        }
        break;
      case "loot":
        {
          reply.ShowLootByPlayer();
        }
        break;

      case "date":
        {
          reply.ShowLootByDate();
        }
        break;
      case "class":
        {
          reply.ShowClassDKP();
        }
        break;
      case "all":
        {
          reply.ShowAllUsersDKP();
        }
        break;

      case "update":
        {
          await reply.UpdateDKPData();
        }
        break;

      case "help":
        {
          await reply.ShowDKPHelp(this.IsAdmin(), this.IsDirectMessage());
        }
        break;

      case "show":
        {
          if (this.IsAdmin()) {
            await reply.ShowConfig();
          }
        }

        break;
      // case "help":
      //   {
      //     await reply.ShowDMHelp();
      //   }
      //   break;

      case "set":
        {
          if (this.IsAdmin()) {
            await reply.ShowSetConfig();
          }

        }
        break;


      case "close":
        {
          await reply.ShowClose();
        }
        break;

      /*
          Start a configuration DM, allowing for setting config parameters
          without doing it in the guild.

          Create a variable storing the current sessions guild id. Maybe
          do it in db, or just in memory.
          Add a timestamp, so we can timeout the session.

          If timed out, we should tell user to do a new initiation from guild channel

        */
      case "dm":
        {
          const guildId = this.message.guild.id;
          const dm = await this.message.author.createDM();
          const dmSession = await this.GetDMConfigSession(dm.id, this.message.author.id, guildId);
          dmSession.guildId = guildId;
          await dmSession.save();
          this.message.author.username
          dm.send(`Hi ${this.message.author.username}, what can I do for you? Not sure? Tell me to \`help\` you`);
        }
        break;

      case "config":
        {
          if (this.IsAdmin()) {
            const guildName = this.message.guild.name;
            const guildId = this.message.guild.id;
            const dm = await this.message.author.createDM();
            const dmSession = await this.GetDMConfigSession(dm.id, this.message.author.id, guildId);
            dmSession.guildId = guildId;
            await dmSession.save();
            this.message.author.username
            dm.send(`Hi ${this.message.author.username}, i'm ready to change my configuration in the \`${guildName}\` server as you requested.\nUse \`!help\` to get a list of commands`);
          }
        }
        break;

      default: {
        // if (this.IsDirectMessage()) {
        //   await reply.ShowDefault();
        // } else {
        //   reply.ShowUserDKP();
        // }
        reply.ShowUserDKP()
      }
    }
    const pResult = performance.now() - pStart;
    this.metrics.MessageProcessTime.set(pResult);
  }

  private async GetDMConfigSession(dmId: string, userId?: string, guildId?: string): Promise<DMConfigSession> {
    let dmSession = null;

    dmSession = await DMConfigSessionObject.findOne({ dmId }, async err => {
      if (err) {
        console.error(err);
      }
    });
    if (dmSession === null) {
      dmSession = await new DMConfigSessionObject({ dmId, userId, guildId });
    }
    return dmSession;
  }

  private IsMessageFromGuild(): boolean {
    const result = this.messageType === "text";
    return result
  }

  private IsDirectMessage(): boolean {
    const result = this.messageType === "dm";
    return result
  }

  private IsAdmin(): boolean {

    let isAdmin = false;
    if (this.message.member === null) {
      const guild = this.client.guilds.cache.find(g => g.id === this.dmSession.guildId);
      const adminRole = guild.roles.cache.find(r => r.name === this.botGuild.GetAdminRole());
      if (!adminRole) {
        return false;
      }
      isAdmin = adminRole.members.some(m => m.user.id === this.message.author.id)

    } else {
      isAdmin = this.message.member.roles.cache.some(r => r.name === this.botGuild.GetAdminRole());
    }

    return isAdmin
  }

  private ShouldMessageBeParsed(): boolean {
    const shouldMessageBeParsed = (this.message.content.startsWith(this.botGuild.GetConfig().trigger) || this.IsDirectMessage());
    return shouldMessageBeParsed;
  }
}
