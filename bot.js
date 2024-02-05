const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const { Client, GatewayIntentBits } = require("discord.js");
const { prefix, token, mongo } = require("./config.json");
const Intents = GatewayIntentBits;
const allIntents = [
  Intents.Guilds,
  Intents.GuildMessages,
  Intents.GuildMembers,
  Intents.GuildPresences,
  Intents.GuildVoiceStates,
  Intents.GuildBans,
  Intents.GuildInvites,
  Intents.GuildWebhooks,
  Intents.GuildScheduledEvents,
  Intents.GuildMessageReactions,
  Intents.DirectMessages,
  Intents.DirectMessageTyping,
  Intents.DirectMessageReactions,
  Intents.GuildMessageTyping,
  Intents.MessageContent,
];

const client = new Client({
  intents: allIntents,
});

const app = express();
const port = 3000;

mongoose.set("strictQuery", false);
mongoose.connect(mongo, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const Komut = mongoose.model("Komut", {
  komut: String,
  yanit: String,
});

const Otorol = mongoose.model("Otorol", {
  guildId: String,
  rolId: String,
  kanalId: String,
});

client.on("ready", () => {
  console.log(`Bot ${client.user.tag} olarak aktif!`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "merhaba") {
    message.reply("Merhaba!");
  } else if (command === "komut-ekle") {
    const [komut, ...yanitArray] = args;
    const yanit = yanitArray.join(" ");

    try {
      const existingCommand = await Komut.findOne({ komut });

      if (existingCommand) {
        message.reply("Bu komut zaten var!");
      } else {
        const yeniKomut = new Komut({ komut, yanit });
        await yeniKomut.save();
        message.reply("Komut eklendi!");
      }
    } catch (error) {
      console.error(error);
      message.reply("Bir hata oluştu.");
    }
  } else {
    const dbCommand = await Komut.findOne({ komut: command });

    if (dbCommand) {
      message.reply(dbCommand.yanit);
    }
  }
});

app.post("/komut-sil", async (req, res) => {
  const { silKomut } = req.body;

  try {
    const deletedCommand = await Komut.findOneAndDelete({ komut: silKomut });

    if (deletedCommand) {
      res.send(`Komut "${silKomut}" başarıyla silindi!`);
    } else {
      res.send(`Komut "${silKomut}" bulunamadı.`);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Bir hata oluştu.");
  }
});

app.use("/channels/me", (req, res) => {
  // `/channels/me` adresine gelen istekleri başka bir sayfaya yönlendir
  res.redirect("/");
});


app.post("/otorol-ayarla", async (req, res) => {
  const { guildId, rolId, kanalId } = req.body;

  try {
    // İlgili sunucu için otorol ayarını güncelle veya oluştur
    await Otorol.findOneAndUpdate({ guildId }, { rolId, kanalId }, { upsert: true });

    res.send("Otorol başarıyla ayarlandı!");
  } catch (error) {
    console.error(error);
    res.status(500).send("Bir hata oluştu.");
  }
});

client.on("guildMemberAdd", async (member) => {
  const existingOtorol = await Otorol.findOne({ guildId: member.guild.id });

  if (existingOtorol) {
    const rol = member.guild.roles.cache.get(existingOtorol.rolId);
    const kanal = member.guild.channels.cache.get(existingOtorol.kanalId);

    if (rol && kanal) {
      try {
        await member.roles.add(rol);
        const embed = {
          color: 0x00ff00,
          title: `Hoş Geldin!`,
          description: `${member.user.username}, sunucumuza hoş geldin!`,
          fields: [
            {
              name: "Rol Verildi",
              value: `Seni ${rol} rolü ile ödüllendirdik!`,
            },
          ],
        };
        kanal.send({ embeds: [embed] });
      } catch (error) {
        console.error(error);
      }
    }
  }
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.post("/komut-ekle", async (req, res) => {
  const { komut, yanit } = req.body;

  try {
    const yeniKomut = new Komut({ komut, yanit });
    await yeniKomut.save();
    res.send("Komut eklendi!");
  } catch (error) {
    console.error(error);
    res.status(500).send("Bir hata oluştu.");
  }
});

client.login(token);

app.listen(port, () => {
  console.log(`Web paneli http://localhost:${port} adresinde çalışıyor.`);
});
