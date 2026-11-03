# CLI Arcade

Node.js 18+ kerak. Tashqi paketlar talab qilinmaydi.

## O‘rnatish va ishga tushirish

Paket npm registry’ga chiqarilgandan so‘ng:

```sh
npm install --global cliarcade
cliarcade
```

Yordam: `cliarcade --help`; versiya: `cliarcade --version`. Matnli rejim: `cliarcade --plain`; ASCII ikonkalari: `cliarcade --ascii-icons`.

Registry’ga chiqarishdan oldin shu loyiha papkasidan lokal o‘rnatish mumkin:

```sh
npm install --global .
cliarcade
```

Loyihani ishlab chiqish rejimida ochish:

```sh
npm start
```

Menyuda oltita o‘yin: tic-tac-toe, chess, minesweeper, checkers, snake va ASCII maze runner. Interaktiv terminalda ishga tushiring (PowerShell, Windows Terminal, macOS yoki Linux terminali).

## npm’ga chiqarish

`package.json` ichidagi `bin` sozlamasi o‘rnatilganda `cliarcade` buyrug‘ini yaratadi. Paketga faqat `bin/`, `src/`, README va npm metadata fayllari kiradi; testlar, skrinshotlar va mahalliy sozlamalar kirmaydi. Nashr oldidan testlar avtomatik ishlaydi.

Test fayllari `--test-concurrency=1` bilan ketma-ket ishlaydi. Bu RAM kam bo‘lgan Windows kompyuterlarida bir vaqtning o‘zida ko‘p Node.js test jarayonlari ochilib, `Zone Allocation failed` / `VirtualAlloc failed` xatolari chiqishining oldini olishga yordam beradi. `prepublishOnly` ham shu test buyrug‘ini ishlatadi.

```sh
npm pack --dry-run
npm login
npm publish
```

Paket nomi `cliarcade` npm’da band bo‘lsa, `name` ni `@USERNAME/cliarcade` ga almashtiring va `npm publish --access public` ishlating. Bunda o‘rnatish `npm install --global @USERNAME/cliarcade` bo‘ladi, ishga tushirish buyrug‘i esa `cliarcade` bo‘lib qoladi. Hozir litsenziya `UNLICENSED` — ochiq manba litsenziyasi berilmagan.

## Loyiha tuzilmasi

```text
cli-games/
├── bin/
│   └── cli.js                 # Dastur kirish nuqtasi
├── src/
│   ├── app.js                 # Interaktiv yoki matnli rejimni ishga tushiradi
│   ├── games/
│   │   ├── engine.js          # Tic-tac-toe, shaxmat va shashka qoidalari
│   │   ├── solo.js            # Minesweeper, Snake va Maze holati
│   │   └── bot.js             # Qonuniy yurishlar va bot qidiruvi
│   ├── ui/
│   │   ├── tui.js             # Menyular va interaktiv o‘yin ekranlari
│   │   ├── plain.js           # Oddiy matnli interfeys
│   │   ├── terminal.js        # Klaviatura, sichqoncha va terminal boshqaruvi
│   │   ├── screen.js          # Faqat o‘zgargan kataklarni chizish
│   │   ├── sprites.js         # Piksel ikonkalari
│   │   └── icons.js           # Ikonka rejimi va ASCII belgilar
│   ├── network/
│   │   └── connection.js      # LAN sessiyasi va yurishlarni tekshirish
│   └── platform/windows/
│       ├── input.js           # Node.js va Windows input adapteri orasidagi aloqa
│       └── WindowsInput.cs    # Native konsol inputi
├── test/                      # O‘yin, UI, tarmoq va Windows testlari
├── fixtures/                  # Windows konsol testlari yordamchi fayllari
├── package.json
├── .gitignore
└── README.md
```

O‘yin qoidalari `src/games/`, ko‘rinish `src/ui/`, TCP aloqa `src/network/` ichida joylashgan. `bin/cli.js` orqali `src/app.js` ishga tushadi. Test yordamchilari ishchi koddan alohida saqlanadi. `npm start`, `npm run start:plain` va `npm test` buyruqlari shu tuzilma bilan ishlaydi.

## Yangi terminal interfeysi

Interaktiv terminalda rangli to‘liq ekran, o‘yin kartalari va bosiladigan tugmalar avtomatik ochiladi. Terminal kamida **64 ustun × 24 qator** bo‘lsin; 28+ qatorda kataklar kattaroq ko‘rinadi. Ranglar va sichqoncha uchun Windows Terminal tavsiya etiladi. Terminal SGR mouse protokolini qo‘llashi kerak. Chiqishda kursor, sichqoncha va oldingi ekran tiklanadi.

Miltillashni kamaytirish uchun har bir kadr xotirada tayyorlanadi va faqat o‘zgargan kataklar terminalga bir martada yoziladi. Ekran ishga tushishda va terminal o‘lchami o‘zgarganda tozalanadi; oddiy yurish yoki Snake harakatida to‘liq tozalanmaydi.

Windows’da native sichqoncha hodisalarini olish uchun tizimdagi Windows PowerShell orqali kichik C# input adapter avtomatik ishga tushadi. **Klaviatura va Ctrl+C darhol ishlaydi**, adapter ishga tushishini kutish shart emas. Adapter o‘yin konsoliga ulanib tayyorligini tasdiqlagach, input unga topshiriladi; ekranda `KLAVIATURA + SICHQONCHA TAYYOR` yozuvi chiqadi. Adapter ishlamasa yoki uzilsa, klaviatura/SGR rejimiga avtomatik qaytiladi. Alohida paket o‘rnatish kerak emas. Linux/macOS’da terminalning inputi bevosita ishlatiladi.

- Menyular: sichqoncha, o‘q tugmalari + Enter yoki 1–6.
- Chess/checkers: donani, keyin belgilangan katakni bosing. Klaviaturada o‘qlar bilan katak tanlang, Enter bosing. Piyoda oxirga yetganda almashtirish menyusi ochiladi.
- Tic-tac-toe: katakni bosing yoki 1–9.
- Minesweeper: chap tugma — ochish, o‘ng tugma — bayroq. Klaviatura: o‘qlar, Enter va F.
- Snake/maze: WASD, o‘qlar yoki ekrandagi yo‘nalish tugmalari. Maze’da yon katakka ham bosish mumkin. Snake’da Space yoki PAUZA tugmasi.
- Q/Esc yoki MENYU — menyuga qaytish; Ctrl+C — chiqish. Tugagan yakka/local/bot o‘yinda R — qayta boshlash.

Standart **PIXEL** ko‘rinishida barcha o‘yin ikonkalari rangli terminal bloklaridan chiziladi. Maxsus shaxmat, shashka yoki emoji shriftlari kerak emas. X/O kattaroq chiziladi; shaxmatdagi oltita dona turining alohida shakli bor; shashkada dumaloq dona va tojli damka, Minesweeper’da grafik mina/bayroq, Snake’da ko‘zli bosh va rangli oziq, Maze’da o‘yinchi va chiqish belgisi ko‘rsatiladi. Oq donalar och rangda, qora donalar kataklarda aniq ajralishi uchun misrangda. Kichik terminalda ikonkalarning ixcham shakli ishlatiladi. Tanlangan katak va mumkin bo‘lgan yurishlar rang bilan ajratiladi.

**I** tugmasi yoki yuqoridagi **I: PIXEL / I: ASCII** tugmasi grafik va oddiy harfli ko‘rinishni o‘yin davomida almashtiradi. ASCII rejimini boshidan yoqish ham mumkin:

```sh
npm start -- --ascii-icons
```

## Bot

Tic-tac-toe, chess va checkers uchun **BOT BILAN** rejimi bor. Oson — tasodifiy qonuniy yurish; o‘rtacha va qiyin — vaqt bilan cheklangan minimax/alpha-beta qidiruvi. Qiyin rejim chuqurroq qidiradi; bu professional shaxmat dvigateli emas. Birinchi yoki ikkinchi tomon sifatida o‘ynash mumkin. Shashkada bot ketma-ket urishni davom ettiradi.

Oddiy matnli interfeysni ochish:

```sh
npm run start:plain
```

Matnli rejimda yurishlar pastdagi buyruqlar bilan kiritiladi; bot rejimi 4-raqam ostida. Pipe orqali ishga tushirilsa matnli rejim avtomatik tanlanadi.

## Matnli rejim boshqaruvi

- **Tic-tac-toe:** 1–9 katak raqamlari.
- **Chess:** `e2 e4`. Rokirovka: `e1 g1` / `e1 c1`. Piyoda almashtirish: `e7 e8 q` (`q`, `r`, `b`, `n`; standart — farzin). Shoh, mat, pat, en passant, rokirovka, 50 yurish va uch marta takrorlanish tekshiriladi. Material yetishmasligiga avtomatik durrang yo‘q.
- **Checkers:** `b3 a4`. Ingliz/amerika shashkasi: oddiy donalar oldinga yuradi va uradi, damka ikki tomonga bir katak yuradi. Urish va ketma-ket urish majburiy; damkaga aylanish navbatni tugatadi. Katta harflar — oq, kichik — qora.
- **Minesweeper:** `o 3 4` — ochish, `f 3 4` — bayroq. Birinchi katak va uning atrofi xavfsiz. 9×9 maydon, 10 mina.
- **Snake:** WASD yoki o‘q tugmalari, Space — pauza. Real vaqt rejimi; Enter kerak emas.
- **Maze:** WASD + Enter. `@` dan `E` gacha boring. Har safar yangi, yechimi bor labirint yaratiladi.
- `q` — o‘yindan menyuga qaytish.

## Multiplayer

Tic-tac-toe, chess va checkers ikki kishilik: bitta kompyuterda yoki TCP/LAN orqali. Host o‘yinni tanlaydi va `LAN host` rejimini ochadi (standart port `4040`). Raqib istalgan ikki kishilik o‘yin menyusida `LAN join` ni tanlab, host kompyuterining lokal IP manzili va ayni portni kiritadi; host tanlagan o‘yin avtomatik yuklanadi. Host birinchi yuradi. Bir kompyuterda tekshirish uchun ikkinchi terminalda `127.0.0.1` ga ulaning.

Windows Firewall so‘rasa, xususiy tarmoqda Node.js’ga ruxsat bering. TCP port ikki kompyuter orasida ochiq bo‘lishi kerak. Bu ishonchli lokal tarmoq uchun, autentifikatsiya va shifrlash yo‘q. Snake, minesweeper va maze yakka o‘yin rejimida.

```sh
npm test
```
