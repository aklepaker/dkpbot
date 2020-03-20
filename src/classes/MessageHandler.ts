import { Message, Client, MessageType } from "discord.js";
import { BotGuild } from "./BotGuild";
import { DMConfigSessionObject, DMConfigSession } from "../objects/DMConfigSession";
import { ChannelReply } from "./ChannelReply";
import { DirectMessageReply } from "./DirectMessageReply";

export class MessageHandler {
  private triggerWord: string;
  private action: string;
  private parameter: string;
  private rawParams: string[];
  private messageType: string;
  private message: Message;
  private botGuild: BotGuild;
  private client: Client;

  constructor(message: Message, client: Client) {
    this.client = client;
    this.message = message;
    this.messageType = message.channel.type;
    this.botGuild = new BotGuild();
    this.ParseParams(message);
  }

  private async ParseParams(message: Message): Promise<void> {
    const params = message.content.split(" ");
    this.rawParams = params;

    switch (this.messageType) {
      case "dm":
        this.action = params[0];
        this.parameter = params.slice(1).join(" ");
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
    /*
    Check if the this.message starts with a trigger, and are executed from a channel
    */
    if (this.IsMessageFromGuild()) {
      await this.botGuild.LoadFromId(this.message.guild.id);
      const reply = new ChannelReply(this.message, this.botGuild);

      /*
      Don't reply to our own this.messages
      */
      if (!this.ShouldMessageBeParsed()) {
        return;
      }

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
            await reply.ShowDKPHelp();
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
        case "config":
          {
            const guildName = this.message.guild.name;
            const guildId = this.message.guild.id;
            const dm = await this.message.author.createDM();
            const dmSession = await this.GetDMConfigSession(dm.id, this.message.author.id, guildId);
            dmSession.guildId = guildId;
            await dmSession.save();
            dm.send(`Configuration for \`${guildName}\``);
          }
          break;

        default: {
          reply.ShowUserDKP();
        }
      }
    }

    /*
    Private this.messages
    */
    if (this.IsDirectMessage()) {
      const dmSession = await this.GetDMConfigSession(this.message.channel.id);
      await this.botGuild.LoadFromId(dmSession.guildId);
      const guild = this.client.guilds.cache.get(dmSession.guildId);
      this.botGuild.SetName(guild.name);

      /*
      Don't reply to our own this.messages
      */
      if (!this.ShouldMessageBeParsed()) {
        return;
      }

      const reply = new DirectMessageReply(this.message, dmSession, this.botGuild);

      if (!dmSession.guildId) {
        reply.ShowInitiateConfig();
        return;
      }

      switch (this.action) {
        case "!show":
          {
            reply.ShowConfig();
          }

          break;
        case "!help":
          {
            reply.ShowHelp();
          }
          break;

        case "!set":
          {
            reply.ShowSetConfig();
          }
          break;

        case "!close":
          {
            reply.ShowClose();
          }
          break;
        default:
          reply.ShowDefault();
      }

      this.botGuild.Save();
    }
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
    return this.messageType === "text";
  }

  private IsDirectMessage(): boolean {
    return this.messageType === "dm";
  }

  private ShouldMessageBeParsed(): boolean {
    const shouldMessageBeParsed =
      (!this.message.author.bot || this.message.author.id !== this.message.client.user.id) &&
      (this.message.content.startsWith(this.botGuild.GetConfig().trigger) || this.IsDirectMessage());

    return shouldMessageBeParsed;
  }
}
