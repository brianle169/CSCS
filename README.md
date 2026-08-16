# Country Soccer Club System

This project built a GUI (Graphical User Interface) to allow interactions with a MySQL database application.

## Members

1. Cong Minh Le - 40264100
2. Hassan Abul - 40260416
3. Claudia Bielecki - 40035333
4. Narmin Ibrahimli - 40126227

## How to run this project

1. **Install dependencies**

   ```
   npm install
   ```

2. **Build the Tailwind CSS**

   In one terminal, run the watcher and leave it running while you work:

   ```
   npm run build:css
   ```

3. **Start the server**

   In a second terminal:

   ```
   npm run dev
   ```

4. **Open the app**

   Visit [http://localhost:3000](http://localhost:3000) in your browser.

## Weekly session emails

Every Sunday the server emails each club member assigned to a session in the
coming week, and logs every email to the `EmailLogs` table (`db/emails.js`,
`routes/emailsRoute.js`, `views/pages/emails.ejs`). Since club member/personnel
emails are made up for this project, nothing is actually delivered over the
network by default — Nodemailer's JSON transport just builds the message
in-memory, which is enough to prove generation for req. 22.

- Visit `/emails` to see the log and to trigger the job on demand (useful
  since the demo can't wait for an actual Sunday) — pick a reference date to
  replay any week that has session data.
- The automatic Sunday run is scheduled in `server.js` via
  [node-cron](https://www.npmjs.com/package/node-cron) (`0 8 * * 0`); it only
  fires while the server process is running.
- To instead route generated emails through a real (but disposable) inbox for
  a live demo, set `MAIL_TRANSPORT=ethereal` in `.env` — see
  `lib/mailer.js` for details. Needs internet access at demo time.
