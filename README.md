# Outbound Tasks ParticipantsCanvas Plugin

## Flex Plugin General Information

Twilio Flex Plugins allow you to customize the appearance and behavior of [Twilio Flex](https://www.twilio.com/flex). If you want to learn more about the capabilities and how to use the API, check out our [Flex documentation](https://www.twilio.com/docs/flex).

## Dialpad Plugin Dependency

This plugin depends on the Dialpad Plugin being available in the Flex UI. You can download and build the Dialpad Plugin from here:

https://github.com/lehel-twilio/plugin-dialpad

Once you have built the plugin and uploaded it to a publicly accessible store (such as Twilio Assets), be sure to update the path to the Dialpad Plugin javascript file in this plugin's `public/appConfig.js` file. This will ensure the Dialpad Plugin is available to you when you run this plugin locally.

## Overview

Outbound tasks created by the Dialpad Plugin only render the CallCanvas by default. This causes various issues when trying to render multiple participants on a call and properly handle call control for those participants. They reason only CallCanvas renders is because the Flex UI is not tracking and storing conference details as it does natively for inbound calls that used the `<Enqueue>` verb.

This plugin and associated serverless functions corrects this issue. The `create-new-task` function updates the Dialpad Plugin's version of this function so that a sync map is created after the task is created, using the task SID as the sync map name. This sync map is where conference details will be stored. 

The `call-outbound-join` function also updates the Dialpad Plugin's version of this function. It handles the various conference events such as participant-join, participant-leave, conference-end, etc, updating the sync map each time with the latest conference change.

The Flex plugin subscribes to this sync map so it receives all of these conference change events. It then writes the conference information to the Flex Redux store the same way the native Flex UI does for inbound calls. This allows the Flex UI to render the ParticipantsCanvas for outbound tasks just as it does for inbound.

## Setup

Make sure you have [Node.js](https://nodejs.org) as well as [`npm`](https://npmjs.com) installed.

Afterwards, install the dependencies by running `npm install`:

```bash
cd 

# If you use npm
npm install
```

## Development

In order to develop locally, you can use the Webpack Dev Server by running:

```bash
npm start
```

This will automatically start up the Webpack Dev Server and open the browser for you. Your app will run on `http://localhost:8080`. If you want to change that you can do this by setting the `PORT` environment variable:

```bash
PORT=3000 npm start
```

When you make changes to your code, the browser window will be automatically refreshed.

## Deploy

Once you are happy with your plugin, you have to bundle it in order to deploy it to Twilio Flex.

Run the following command to start the bundling:

```bash
npm run build
```

Afterwards, you'll find in your project a `build/` folder that contains a file with the name of your plugin project. For example, `plugin-example.js`. Take this file and upload it into the Assets part of your Twilio Runtime.

Note: Common packages like `React`, `ReactDOM`, `Redux` and `ReactRedux` are not bundled with the build because they are treated as external dependencies so the plugin will depend on Flex to provide them globally.