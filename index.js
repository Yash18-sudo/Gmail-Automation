const { google } = require("googleapis");

const {
  CLIENT_ID,
  CLEINT_SECRET,
  REDIRECT_URI,
  REFRESH_TOKEN,
} = require("./credentials");


const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLEINT_SECRET,
  REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });


const repliedUsers = new Set();

async function checkEmailsAndSendReplies() {
  try {
    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

    
    const res = await gmail.users.messages.list({
      userId: "me",
      q: "is:unread",
    });
    const messages = res.data.messages;

    if (messages && messages.length > 0) {
      
      for (const message of messages) {
        const email = await gmail.users.messages.get({
          userId: "me",
          id: message.id,
        });

        const from = email.data.payload.headers.find(
          (header) => header.name === "From"
        );
        const toHeader = email.data.payload.headers.find(
          (header) => header.name === "To"
        );
        const Subject = email.data.payload.headers.find(
          (header) => header.name === "Subject"
        );
        
        const From = from.value;
        const toEmail = toHeader.value;
        const subject = Subject.value;
        console.log("email come From", From);
        console.log("to Email", toEmail);
        
        if (repliedUsers.has(From)) {
          console.log("Already replied to : ", From);
          continue;
        }
        
        const thread = await gmail.users.threads.get({
          userId: "me",
          id: message.threadId,
        });

        
        const replies = thread.data.messages.slice(1);

        if (replies.length === 0) {
          
          await gmail.users.messages.send({
            userId: "me",
            requestBody: {
              raw: await createReplyRaw(toEmail, From, subject),
            },
          });

          
          const labelName = "Automated";
          await gmail.users.messages.modify({
            userId: "me",
            id: message.id,
            requestBody: {
              addLabelIds: [await createLabelIfNeeded(labelName)],
            },
          });

          console.log("Sent reply to email:", From);
          
          repliedUsers.add(From);
        }
      }
    }
  } catch (error) {
    console.error("Error occurred:", error);
  }
}

//this function is basically converte string to base64EncodedEmail format
async function createReplyRaw(from, to, subject) {
  const emailContent = `From: ${from}\nTo: ${to}\nSubject: ${subject}\n\n
  Hey there! 😊 \n

  Thanks for dropping me a line. 🌟 I'm currently away and embracing some offline time 🛫. \n
  
  I'll get back to you as soon as I return to the digital world. Until then, take care and talk to you soon! \n
  
  Best Regards,\n
  Yash Bahuguna`;
  const base64EncodedEmail = Buffer.from(emailContent)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return base64EncodedEmail;
}


async function createLabelIfNeeded(labelName) {
  const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
  
  const res = await gmail.users.labels.list({ userId: "me" });
  const labels = res.data.labels;

  const existingLabel = labels.find((label) => label.name === labelName);
  if (existingLabel) {
    return existingLabel.id;
  }

 
  const newLabel = await gmail.users.labels.create({
    userId: "me",
    requestBody: {
      name: labelName,
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
    },
  });

  return newLabel.data.id;
}


function getRandomInterval(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

setInterval(checkEmailsAndSendReplies, getRandomInterval(45, 120) * 1000);









/*note on areas where your code can be improved.
  1.Error handling: The code currently logs any errors that occur during the execution but does not handle them in a more robust manner.
  2.Code efficiency: The code could be optimized to handle larger volumes of emails more efficiently.
  3.Security: Ensuring that sensitive information, such as client secrets and refresh tokens, are stored securely and not exposed in the code.
  4.User-specific configuration: Making the code more flexible by allowing users to provide their own configuration options, such as email filters or customized reply messages.
  These are some areas where the code can be improved, but overall, it provides implementation of auto-reply functionality using the Gmail API.
  5.Time Monitoring: The code currently use randominterval function to generate seconds and in this code can be improved by adding cron jobs package to schedule email tasks 
*/
