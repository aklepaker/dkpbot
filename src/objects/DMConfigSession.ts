/* eslint-disable @typescript-eslint/no-empty-interface */
import { Schema, Document, Model, model } from "mongoose";

/*
    Schema for Direct Message Config storing USER-ID and GuildID togheter with
    DM Id, so we can map what GUILD a user is located to from a DM.

    Add TIMESTAMP so we can timeout the session?
*/

const DMConfigSessionSchema = new Schema({
  guildId: {
    type: String,
    required: false,
    unique: false
  },
  userId: {
    type: String,
    unique: false,
    required: false
  },
  dmId: {
    type: String,
    unique: true,
    required: true
  }
});

interface DMConfigSessionSchema extends Document {
  guildId: string;
  userId: string;
  dmId: string;
}

export interface DMConfigSession extends DMConfigSessionSchema {
  //
}

export const DMConfigSessionObject = model<DMConfigSession>("DMConfigSession", DMConfigSessionSchema);

// export const NewGuildObject = async (): Promise<GuildObjectBase> => {
//   return await GuildObject.create();
// };
