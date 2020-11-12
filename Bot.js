const Discord = require("discord.js");
const bot = new Discord.Client();
const Canvas = require("canvas");
const { Server } = require("http");
const ytdl = require("ytdl-core");
const { connect } = require("http2");

var g = 0;
var s = 0;
const queue = new Map();

const applyText = (canvas, text) => {
    const ctx = canvas.getContext('2d');
    let fontSize = 70;
    do {
        ctx.font = `${fontSize -= 10}px sans-serif`;
    } while (ctx.measureText(text).width > canvas.width - 300);
    return ctx.font;
};

function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return
    }
    const dispatcher =
    serverQueue.connection.playStream(ytdl(song.url))
        .on("finish", () => {
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })
        .on("error", error => {
            console.error(error);
        });
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
}

async function caraPlay(message, serverQueue) {
    try {
        const args = message.content.split(" ");
        const voiceChannel = message.member.voiceChannel;
        if (!voiceChannel) return message.channel.send ("Tu dois d\'abord rejoindre un salon vocal !");
        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
            return message.channel.send("J'ai besoin de droits pour rejoindre et pour parler dans le salon vocal !");
        }
        const songInfo = await ytdl.getInfo(args[1]);
        const song = {
            title: songInfo.title,
            url: songInfo.video_url,
        };
        if (!serverQueue) {
            const queueConstruct = {
                textChannel: message.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [],
                volume: 5,
                playing: true
            };
            const connection = await voiceChannel.join();
            if (!connection) {
                queue.delete(`${message.guild.id}`);
            }
            queueConstruct.connection =connection;
            queueConstruct.songs.push(song);
            queue.set(message.guild.id, queueConstruct);
            message.channel.send(`[${queueConstruct.songs.length}] : ${queueConstruct.songs[0].title} a été ajouté à la liste !}`);
            serverQueue = queue.get(message.guild.id);
            play(message.guild, serverQueue.songs[0]);
        } else {
            serverQueue.songs.push(song);
            message.channel.send(`[${serverQueue.songs.length}] : ${song.title} a été ajouté à la liste !`);
        }
    } catch (exception) {
        return message.channel.send({ embed:
        {
            color: 16711680,
            description: `__**ERREUR**__\nLa commande n\'a pas fonctionnée
            <:joyeux_carapuce:775359409026367529>\n\n__L\'erreur suivante s\'est
            produite :__\n*${exception}*`
        }});
    }
}

function caraSkip(message, serverQueue) {
    if (message.member.voiceChannel && serverQueue.songs) {
        serverQueue.songs.pop();
        if (serverQueue.songs.length() > 0)
            play(message.guild, serverQueue.songs[0])
    }
}

function caraStop(message, serverQueue) {
    if (!message.member.voiceChannel)
        return message.channel.send("Tu dois d\'abord rejoindre un salon vocal !");
    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
    serverQueue.voiceChannel.leave();
}

const DJCarapuce = (message) => {
    if (message.content.startsWith("!caraplay")) {
        caraPlay(message, queue);
    } else if (message.content.startsWith("!caraskip")) {
        caraSkip(message, queue);
    } else if (message.content.startsWith("!carastop")) {
        caraStop(message, queue);
    }
};

bot.on("ready", function () {
console.log("Carapuce est dans les places !");
});

bot.on("message", message => {
    if (message.content.startsWith("!caraplay") ||
    message.content.startsWith("!caraskip") || message.content.startsWith("!carastop")) {
        DJCarapuce(message);
    }
    if (message.content === "!ping") {
        message.channel.send("Carapong !");
    }
    if(message.content === "!carabonjour") {
        message.channel.send('<@' + message.author + ">, Carabonjour à toi!");
        message.react('👀');
        message.react(bot.emojis.cache.get('775355626732781629'));
    }
    if(message.content.startsWith("!pin ")) {
        message.pin({reason: 'important' })
    }
    if (message.content === "!carajoin") {
        bot.emit("guildMemberAdd", message.member);
        return;
    }
    if (message.content === "!emojiliste") {
        const emojiliste = message.guild.emojis.cache.map((e) => "<:" + e.name + ':' + e + '>' + " => :" + e.name + ':' );
        message.channel.send(emojiliste);
    }
    if(message.content.match(/Carapuce/i)) {
        message.react(bot.emojis.cache.get('775355626732781629'))
    }
    if (message.content === "!caraquiz") {
        g = 1;
        message.channel.send("Let's go pour le caraquiz jeune tortue");
        message.channel.send ({
            embed: {
                color: 3447003,
                description: " **Question n°1** ",
                fields: [
                    {
                        name: "Bulbizarre est le premier pokémon du Pokédex",
                        value: "A: Vrai B: Faux"
                    }
                ]
            }
        })
    }
    if (message.content === 'A' && g === 3) {
        message.channel.send("C'est la bonne réponse héhé !");
        s++;
        g++;
    } else if (message.content === 'B' && g === 3) {
        message.channel.send("Mauvaise réponse Bucko");
        g++;
    }
    if (g === 4) {
        message.channel.send("Fin du caraquiz !");
        message.channel.send("Tu as fais " + s + "/2 !")
        s = 0;
        g = 0;
    }
    if (message.content === 'A' && g === 1) {
        s++;
        g++;
        message.channel.send("Bonne réponse amigo !");
    } else if (message.content === 'B' && g === 1) {
        message.channel.send("Mauvaise réponse ! We'll get them next time");
        g++;
    }
    if (g === 2) {
            g++;
            message.channel.send ({
                embed: {
                    color: 3447003,
                    description: " **Question n°2** ",
                    fields: [
                        {
                            name: "Est-ce que t'es pas un peu le boss du quiz game ?",
                            value: "A: Vrai B: Faux"
                        }
                    ]
                }
            })
    }
    if (message.content === "!carahelp") {
        message.channel.send({
            embed: {
                color: 3447003,
                description: "__**Les différentes commandes**__",
                fields: [
                    {
                        name: "!carahelp",
                        value: "Pour afficher cette aide."
                    },
                    {
                        name: "!ping",
                        value: "Pong !"
                    },
                    {
                        name: "!carabonjour",
                        value: "Says hi to our friend Squirtle"
                    },
                    {
                        name: "!pin",
                        value: "Pins a message in a channel"
                    },
                    {
                        name: "!emojiliste",
                        value: "Display a list of all the server's emoji"
                    },
                    {
                        name: "!caraquiz",
                        value: "Starts a quiz game"
                    },
                    {
                        name: "!carajoin",
                        value: "simulates the arrival of a new member"
                    },
                    {
                        name: "!caraplay",
                        value : "Plays a music"
                    },
                    {
                        name: "!caraskip",
                        value: "Skips a music"
                    },
                    {
                        name: "!carastop",
                        value: "Stops a music"
                    }
                ]
            }
        });
    }
});

bot.on("guildMemberAdd", async member => {
    const channel = member.guild.channels.cache.find(ch => ch.name === 'général');
    if (!channel) return;
    const canvas = Canvas.createCanvas(1024, 700);
    const ctx = canvas.getContext('2d');
    const background = await Canvas.loadImage("./welcome.png");
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    ctx.fillText(member.displayName, 20, 685);
    ctx.fillStyle = "#ff5733"
    applyText(canvas, ctx.text);
    ctx.beginPath();
    ctx.arc(825, 175, 125, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    /*const avatar = await Canvas.loadImage(member.user.avatarURL);
    ctx.drawImage(avatar, 700, 50, 256, 256);*/
    const attachment = new Discord.MessageAttachment(canvas.toBuffer(), "welcome-image.png");
    channel.send(`Bienvenue sur ce CaraSeveur, <@${member.id}> ! <:joyeux_carapuce:775359409026367529>`, attachment);
});

bot.login("Nzc1MzQyMDYxODA4MjU1MDE2.X6k7kA.bKJLV-VIAmJzKzhVTeT40tfd0Qo");