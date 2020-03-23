# Description

Main purpose of this bot is to enable searching of the guilds DKP table without beeing logged in to the game.
Using `!dkpb update` makes the bot request a file for update, and when the file is received by the bot it parses the file and stores the DKP loot table and history in a MongoDB database making it searchable by the bot when a user issues a `!dkpb` command.

Monolith DKP file is in most cases located here: `C:\Program Files(x86)\World of Warcraft\_classic_\WTF\Account\<USERNAME>\SavedVariables\MonolithDKP.lua` when uploading a new DKP table.

# Usage

Create a .env file in the root directory of the repository

```
TOKEN=<DISCORD TOKEN>
MONGO_USERNAME=
MONGO_PASSWORD=
MONGO_HOSTNAME=
MONGO_PORT=
MONGO_DB=
METRIC_PORT=3300
METRIC_IP=0.0.0.0
```

Build and start the bot

```
npm install
npm start
```

# Discord Usage

#### Show all commands

!dkpb help

#### Search all loots for the given item

!dkpb search <item>

#### Show current DKP status for a user

!dkpb <user> | all

```
!dkpb Graa
!dkpb all
```

#### Show all items a user have looted

!dkpb loot <user>

#### Show all items on a date from an instance

!dkpb date <dd.mm.yyyy> <instance>

```
!dkpb date 16.03.2020 molten
```

#### Show DKP status for a given class

!dkpb class <class>

```
!dkpb class priest
```

#### Update the DKP table from a new Monolith DKP file

!dkpb update

# Bot invite

https://discordapp.com/oauth2/authorize?client_id=688355024396353595&scope=bot&permissions=518208
