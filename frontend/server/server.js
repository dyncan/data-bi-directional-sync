import jsforce from "jsforce";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import express from "express";
import dotenv from "dotenv";
import PubSubApiClient from "salesforce-pubsub-api-client";
import WebSocketService from "./webSocketService.js";

dotenv.config();

const {
  loginUrl,
  consumerKey,
  consumerSecret,
  callbackUrl,
  apiVersion,
  isHttps,
  sessionSecretKey,
  PORT = 3002,
} = process.env;

// Load and check config
if (!(loginUrl && consumerKey && consumerSecret && callbackUrl && apiVersion)) {
  console.error(
    "Cannot start app: missing mandatory configuration. Check your .env file."
  );
  process.exit(-1);
}

const oauth2 = new jsforce.OAuth2({
  loginUrl,
  clientId: consumerKey,
  clientSecret: consumerSecret,
  redirectUri: callbackUrl,
});

function getSession(request, response) {
  const session = request.session;
  if (!session.sfdcAuth) {
    response.status(401).send("No active session");
    return null;
  }
  return session;
}

function resumeSalesforceConnection(session) {
  return new jsforce.Connection({
    oauth2,
    instanceUrl: session.sfdcAuth.instanceUrl,
    accessToken: session.sfdcAuth.accessToken,
    version: apiVersion,
  });
}

// Setup HTTP server
const app = express();
app.set("port", PORT);

// Enable server-side sessions
app.use(
  session({
    secret: sessionSecretKey,
    cookie: { secure: isHttps === "true" },
    resave: false,
    saveUninitialized: false,
  })
);

const __filenameNew = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filenameNew);

app.use("/", express.static(path.join(__dirname, "../public")));

/**
 * Login endpoint
 */
app.get("/auth/login", (request, response) => {
  // Redirect to Salesforce login/authorization page
  response.redirect(oauth2.getAuthorizationUrl({ scope: "api" }));
});

/**
 * Logout endpoint
 */
app.get("/auth/logout", (request, response) => {
  const session = getSession(request, response);
  if (session == null) return;

  // Revoke OAuth token
  const conn = resumeSalesforceConnection(session);
  conn.logout((error) => {
    if (error) {
      console.error("Salesforce OAuth revoke error:", error);
      response.status(500).json(error);
      return;
    }

    // Destroy server-side session
    session.destroy((error) => {
      if (error) {
        console.error("Salesforce session destruction error:", error);
        return;
      }
    });

    // Redirect to app home page
    return response.redirect("/");
  });
});

/**
 * Login callback endpoint (only called by Salesforce)
 */
app.get("/auth/callback", (request, response) => {
  if (!request.query.code) {
    response
      .status(500)
      .send("Failed to get authorization code from server callback.");
    return;
  }

  // Authenticate with OAuth
  const conn = new jsforce.Connection({
    oauth2,
    version: apiVersion,
  });

  conn.authorize(request.query.code, (error, userInfo) => {
    if (error) {
      console.log("Salesforce authorization error:", error);
      response.status(500).json(error);
      return;
    }

    // Store oauth session data in server (never expose it directly to client)
    request.session.sfdcAuth = {
      instanceUrl: conn.instanceUrl,
      accessToken: conn.accessToken,
    };
    // Redirect to app home page
    return response.redirect("/");
  });
});

app.get("/auth/whoami", (request, response) => {
  const session = getSession(request, response);
  if (session == null) {
    return;
  }

  // Request session info from Salesforce
  const conn = resumeSalesforceConnection(session);
  conn.identity((error, res) => {
    pubSubConnect(session, res);
    response.send(res);
  });
});

app.get("/api/contacts/:contactId", (request, response) => {
  const session = getSession(request, response);
  if (session == null) {
    return;
  }

  const { contactId } = request.params;
  const query = `SELECT Id, Name, FirstName, LastName, Phone, Email, Title, Status__c FROM Contact WHERE Id='${contactId.replace(
    "'",
    ""
  )}'`;

  // Request session info from Salesforce
  const conn = resumeSalesforceConnection(session);
  conn.query(query, (error, result) => {
    if (error) {
      console.error("Salesforce data API error: " + JSON.stringify(error));
      response.status(500).json(error);
      return;
    } else {
      response.send(result);
      return;
    }
  });
});

const server = app.listen(app.get("port"), () => {
  console.log(`Server started: http://localhost:${app.get("port")}/`);
});

const wss = new WebSocketService();
wss.connect(server);

async function pubSubConnect(conn, userInfo) {
  const pubSubClient = new PubSubApiClient();
  await pubSubClient.connectWithAuth(
    conn.sfdcAuth.accessToken,
    conn.sfdcAuth.instanceUrl,
    userInfo.organization_id,
    userInfo.username
  );

  // Subscribe to Change Data Capture events on Reseller Order records
  const contactCdcEmitter = await pubSubClient.subscribe(
    "/data/ContactChangeEvent",
    1
  );

  contactCdcEmitter.on("data", (cdcEvent) => {
    const status = cdcEvent.payload.Status__c?.string;
    const header = cdcEvent.payload.ChangeEventHeader;
    // Filter events related to order status updates
    if (header.changeType === "UPDATE" && status) {
      header.recordIds.forEach((contactId) => {
        // Notify client via WebSocket
        const message = {
          type: "statusEvent",
          data: {
            contactId,
            status,
          },
        };
        wss.broadcast(JSON.stringify(message));
      });
    }
  });

  // Handle incoming WS events
  wss.addMessageListener(async (message) => {
    const { firstName, lastName, status__c, userId } = message.data;
    const eventData = {
      CreatedDate: Date.now(),
      CreatedById: userId,
      Status__c: { string: status__c },
      FirstName__c: { string: firstName },
      LastName__c: { string: lastName },
    };
    console.log("OUTPUT eventData : ", eventData);
    await pubSubClient.publish("/event/Contact_Event__e", eventData);
  });
}
