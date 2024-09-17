require('./settings')
const pino = require('pino')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const FileType = require('file-type')
const path = require('path')
const axios = require('axios')
const PhoneNumber = require('awesome-phonenumber')
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif')
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetch, await, sleep, reSize } = require('./lib/myfunc')
const { default: XeonBotIncConnect, delay, PHONENUMBER_MCC, makeCacheableSignalKeyStore, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, generateForwardMessageContent, prepareWAMessageMedia, generateWAMessageFromContent, generateMessageID, downloadContentFromMessage, makeInMemoryStore, jidDecode, proto } = require("@whiskeysockets/baileys")
const NodeCache = require("node-cache")
const Pino = require("pino")

const store = makeInMemoryStore({
    logger: pino().child({
        level: 'silent',
        stream: 'store'
    })
})

const phoneNumber = "917994107442"
const owner = JSON.parse(fs.readFileSync('./database/owner.json'))

const pairingCode = true // always use pairing code in this version

async function startXeonBotInc() {
    let { version, isLatest } = await fetchLatestBaileysVersion()
    const { state, saveCreds } = await useMultiFileAuthState(`./session`)
    const msgRetryCounterCache = new NodeCache()
    const XeonBotInc = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: !pairingCode,
        mobile: false,
        browser: ['Chrome (ABHI-BUG-BOT)', '', ''],
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, Pino({ level: "fatal" }).child({ level: "fatal" }))
        },
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        getMessage: async (key) => {
            let jid = jidNormalizedUser(key.remoteJid)
            let msg = await store.loadMessage(jid, key.id)
            return msg?.message || ""
        },
        msgRetryCounterCache,
        defaultQueryTimeoutMs: undefined
    })

    store.bind(XeonBotInc.ev)

    if (pairingCode && !XeonBotInc.authState.creds.registered) {
        if (!phoneNumber) {
            console.log(chalk.bgBlack(chalk.redBright("Enter Your WhatsApp Number With Your Country Code, 📌Example : +919074692450")))
            process.exit(0)
        } else {
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '')
            if (!Object.keys(PHONENUMBER_MCC).some(v => phoneNumber.startsWith(v))) {
                console.log(chalk.bgBlack(chalk.redBright("Enter Your WhatsApp Number With Your Country Code, 📌Example : +919074692450")))
                process.exit(0)
            }

            setTimeout(async () => {
                let code = await XeonBotInc.requestPairingCode(phoneNumber)
                code = code?.match(/.{1,4}/g)?.join("-") || code
                console.log(chalk.black(chalk.bgGreen(`Your Pairing Code Is : `)), chalk.black(chalk.white(code)))
            }, 3000)
        }
    }

    XeonBotInc.ev.on('messages.upsert', async chatUpdate => {
        try {
            const mek = chatUpdate.messages[0]
            if (!mek.message) return
            mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
            if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                if (autoread_status) {
                    await XeonBotInc.readMessages([mek.key])
                }
            }
            if (!XeonBotInc.public && !mek.key.fromMe && chatUpdate.type === 'notify') return
            if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return
            const m = smsg(XeonBotInc, mek, store)
            require("./ABHI-BUG-BOT")(XeonBotInc, m, chatUpdate, store)
        } catch (err) {
            console.log(err)
        }
    })

    XeonBotInc.decodeJid = (jid) => {
        if (!jid) return jid
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {}
            return decode.user && decode.server && decode.user + '@' + decode.server || jid
        } else return jid
    }

    XeonBotInc.ev.on('contacts.update', update => {
        for (let contact of update) {
            let id = XeonBotInc.decodeJid(contact.id)
            if (store && store.contacts) store.contacts[id] = {
                id,
                name: contact.notify
            }
        }
    })

    XeonBotInc.getName = (jid, withoutContact = false) => {
        id = XeonBotInc.decodeJid(jid)
        withoutContact = XeonBotInc.withoutContact || withoutContact
        let v
        if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
            v = store.contacts[id] || {}
            if (!(v.name || v.subject)) v = XeonBotInc.groupMetadata(id) || {}
            resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
        })
        else v = id === '0@s.whatsapp.net' ? {
            id,
            name: 'WhatsApp'
        } : id === XeonBotInc.decodeJid(XeonBotInc.user.id) ?
            XeonBotInc.user :
            (store.contacts[id] || {})
        return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
    }

    XeonBotInc.public = true

    XeonBotInc.serializeM = (m) => smsg(XeonBotInc, m, store)

    XeonBotInc.ev.on("connection.update", async (s) => {
        const { connection, lastDisconnect } = s
        if (connection === "open") {
            console.log(chalk.magenta(` `))
            console.log(chalk.yellow(`✅Connected to => ` + JSON.stringify(XeonBotInc.user, null, 2)))
            await delay(1999)
            console.log(chalk.yellow(`\n\n                  ${chalk.bold.blue(`[ ${botname} ]`)}\n\n`))
            console.log(chalk.cyan(`< ================================================== >`))
            console.log(chalk.magenta(`\n${themeemoji} YT CHANNEL: Comedy Melody CH`))
            console.log(chalk.magenta(`${themeemoji} GITHUB: AbhishekSuresh2 `))
            console.log(chalk.magenta(`${themeemoji} INSTAGRAM: @abhishek_ser `))
            console.log(chalk.magenta(`${themeemoji} WA NUMBER: ${owner}`))
            console.log(chalk.magenta(`${themeemoji} Thank You For Using ${botname}\n`))
        }
        if (
            connection === "close" &&
            lastDisconnect &&
            lastDisconnect.error &&
            lastDisconnect.error.output.statusCode != 401
        ) {
            startXeonBotInc()
        }
    })
    XeonBotInc.ev.on('creds.update', saveCreds)
    XeonBotInc.ev.on("messages.upsert", () => { })

    XeonBotInc.sendText = (jid, text, quoted = '', options) => XeonBotInc.sendMessage(jid, {
        text: text,
        ...options
    }, {
        quoted,
        ...options
    })
    XeonBotInc.sendTextWithMentions = async (jid, text, quoted, options = {}) => XeonBotInc.sendMessage(jid, {
        text: text,
        mentions: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net'),
        ...options
    }, {
        quoted
    })
    XeonBotInc.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
        let buff = await getBuffer(path);
        let mime = await FileType.fromBuffer(buff);
        let image = mime?.ext === 'jpg' || mime?.ext === 'jpeg' ? buff : await imageToWebp(buff);
        return XeonBotInc.sendMessage(jid, {
            sticker: {
                url: image,
            },
            ...options
        }, {
            quoted
        });
    }
    XeonBotInc.sendVideoAsSticker = async (jid, path, quoted, options = {}) => {
        let buff = await getBuffer(path);
        let
mime = await FileType.fromBuffer(buff); let video = mime?.ext === 'mp4' ? buff : await videoToWebp(buff); return XeonBotInc.sendMessage(jid, { sticker: { url: video, }, ...options }, { quoted }); }

typescript
Copy code
XeonBotInc.sendMedia = async (jid, path, type, caption, quoted, options = {}) => {
    let buffer = await getBuffer(path);
    let mime = await FileType.fromBuffer(buffer);
    if (type === 'image') {
        return XeonBotInc.sendMessage(jid, {
            image: {
                url: buffer,
            },
            caption,
            ...options
        }, {
            quoted
        });
    } else if (type === 'video') {
        return XeonBotInc.sendMessage(jid, {
            video: {
                url: buffer,
            },
            caption,
            ...options
        }, {
            quoted
        });
    } else {
        return XeonBotInc.sendMessage(jid, {
            document: {
                url: buffer,
            },
            caption,
            ...options
        }, {
            quoted
        });
    }
}

XeonBotInc.sendFile = async (jid, path, filename, caption, quoted, options = {}) => {
    let buffer = await getBuffer(path);
    let mime = await FileType.fromBuffer(buffer);
    return XeonBotInc.sendMessage(jid, {
        document: {
            url: buffer,
        },
        caption,
        fileName: filename,
        mimetype: mime.mime,
        ...options
    }, {
        quoted
    });
}

return XeonBotInc
}
startXeonBotInc()
startXeonBotInc()
