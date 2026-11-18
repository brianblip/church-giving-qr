# Church Giving QR

A TV slide for tithes and offering with the church's GCash and BDO QR codes, plus a "Give from abroad" page for members outside the Philippines.

- `output/offering-slide.png`: the 1920×1080 image to show on the TV
- `docs/index.html`: the "Give from abroad" page, which the small corner QR opens

## 1. Get the official QR codes (don't make your own)

Use the codes the apps create for the church's account. They're QR Ph codes, so **any** Philippine bank or e-wallet app can scan them, and since they have no fixed amount, members type whatever they want to give.

**GCash** (on the church's GCash account): open the app → **QR** / **Receive** → **Receive via QR** → download or screenshot it. Don't set an amount.

**BDO** (on the church's BDO Online / BDO Pay): look for **Generate QR** / **Receive money via QR** → choose the church's account → leave the amount blank → save the image.

Crop each image so mostly the QR code is showing (a little white border is fine), then save them as:

```
qr/gcash.png
qr/bdo.png
```

**Test before Sunday:** scan each code from a different phone and send ₱1. Check that the name on the confirmation screen is the church's and that the money arrives.

## 2. Fill in the church details

Edit `config.json`: church name, verse, GCash name and number, BDO account name, number, and branch. BDO's SWIFT code (`BNORPHMM`) is already filled in.

## 3. Put the "Give from abroad" page online (free, with GitHub Pages)

1. Push this folder to a GitHub repository.
2. Go to **Settings → Pages**, set Source to **Deploy from a branch**, pick branch `main` and folder `/docs`, then save.
3. GitHub shows the page URL, something like `https://<username>.github.io/church-giving-qr/`.
4. Put that URL in `config.json` as `abroadPageUrl` and rebuild (step 4). The corner QR then points to it.

## 4. Build

```bash
npm install
npm run build
```

This makes `output/offering-slide.png` (exported with Google Chrome; set `CHROME_PATH` if Chrome is somewhere else) and `docs/index.html`. Run the build again any time you change `config.json` or the QR images, and push again so the abroad page updates.

## 5. Show it on the TV

Copy `output/offering-slide.png` to a USB stick and open it on the TV, or add it as a full-screen slide in your presentation software. Before the first Sunday, try scanning from the back row. If it doesn't scan, turn the TV brightness down a little and move people closer, or show it on more than one screen.
