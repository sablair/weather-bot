'use strict';

const routes = require('express').Router();
const request = require('request');
const axios = require('axios');

// Generated from Facebook developer dashboard for the app
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// Randomly generated string
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// My apps app ID generated via https://openweathermap.org/
const OPEN_WEATHER_MAP_APP_ID = process.env.OPEN_WEATHER_MAP_APP_ID;

// Creates the endpoint for our webhook 
routes.post('/webhook', (req, res) => {
    const body = req.body;

    // Checks this is an event from a page subscription
    if (body.object === 'page') {
        // Iterates over each entry - there may be multiple if batched
        body.entry.forEach((entry) => {

            // Gets the message. entry.messaging is an array, but 
            // will only ever contain one message, so we get index 0
            const webhook_event = entry.messaging[0];
            console.log(webhook_event);

            // Get the sender PSID
            const sender_psid = webhook_event.sender.id;
            console.log('Sender PSID: ' + sender_psid);

            // Check if the event is a message or postback and
            // pass the event to the appropriate handler function
            if (webhook_event.message) {
                handleMessage(sender_psid, webhook_event.message);
            } 
            
            // No postbacks done in this project
            // else if (webhook_event.postback) {
            //     handlePostback(sender_psid, webhook_event.postback);
            // }
        });

        // Returns a '200 OK' response to all requests
        res.status(200).send('EVENT_RECEIVED');
    } else {
        // Returns a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }
});

// Adds support for GET requests to our webhook
routes.get('/webhook', (req, res) => {
    // Parse the query params
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {
        // Checks the mode and token sent is correct
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {

            // Responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);

        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
});

// IDs for cities that I am interested in
const SINGAPORE_ID = "1880252";
const JAKARTA_ID = "1642911";
const KUALA_LUMPUR_ID = "1733046";
const BANGKOK_ID = "1609350";
const PHNOM_PENH_ID = "1821306";
const KINGSTON_ID = "3489854";
const HAVANA_ID = "3553478";

// Handles messages events
async function handleMessage(sender_psid, received_message) {
    let response;

    if (received_message.quick_reply) {
        response = await getResponse(received_message.quick_reply.payload);
    } else {
        response = {
            "text": "Select a city:",
            "quick_replies": [
                {
                    "content_type": "text",
                    "title": "Singapore",
                    "payload": SINGAPORE_ID
                },
                {
                    "content_type": "text",
                    "title": "Jakarta",
                    "payload": JAKARTA_ID
                },                     
                {
                    "content_type": "text",
                    "title": "Kuala Lumpur",
                    "payload": KUALA_LUMPUR_ID
                },                     
                {
                    "content_type": "text",
                    "title": "Bangkok",
                    "payload": BANGKOK_ID
                },                     
                {
                    "content_type": "text",
                    "title": "Phnom Penh",
                    "payload": PHNOM_PENH_ID
                },                                                
                {
                    "content_type": "text",
                    "title": "Kingston",
                    "payload": KINGSTON_ID
                },
                {
                    "content_type": "text",
                    "title": "Havana",
                    "payload": HAVANA_ID
                },        
            ]
        };
    }

    // Send the response message
    callSendAPI(sender_psid, response);
}

async function getResponse(payload) {
    let response;
    const uri = `https://api.openweathermap.org/data/2.5/weather?id=${payload}&appid=${OPEN_WEATHER_MAP_APP_ID}`;
    console.log(`API call ${uri}`);
    
    // Set the response based on the postback payload
    if (payload) {
        try {            
            const result = await axios.get(uri);
            console.log('data', result.data);
            response = { "text" : `Current weather in ${result.data.name} is ${result.data.weather[0].description}` };                
        } catch (error) {
            console.error(error);
            response = { "text": "Sorry, we encountered an error. Please try again." };
        }
    } else {
        response = { "text": "Invalid city entered." };
    }   
    
    return response;
}

// Handles messaging_postbacks events. Not in use, as I use quick_replies instead of postbacks
async function handlePostback(sender_psid, received_postback) {   
    // Get the payload for the postback
    const { payload } = received_postback;    
    const response = await getResponse(payload);

    // Send the message to acknowledge the postback
    callSendAPI(sender_psid, response);
}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
    // Construct the message body
    const request_body = {
        "recipient": {
            "id": sender_psid
        },
        "message": response
    }

    // Send the HTTP request to the Messenger Platform
    request({
        "uri": "https://graph.facebook.com/v2.6/me/messages",
        "qs": { "access_token": PAGE_ACCESS_TOKEN },
        "method": "POST",
        "json": request_body
    }, (err, res, body) => {
        if (!err) {
            console.log('message sent!')
        } else {
            console.error(`Unable to send message:${err}`);
        }
    });
}

module.exports = routes;