const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

require('dotenv').config({ path: 'variables.env' });
const createServer = require('./createServer');
const db = require('./db');

const server = createServer();

server.express.use(cookieParser());

// decode JWT to get the user ID of each request
server.express.use((req, res, next) => {
    const { token } = req.cookies;

    if (token) {
        const { userID } = jwt.verify(token, process.env.APP_SECRET);

        // put the userID onto the req for future access
        req.userID = userID;
    }

    next();
})

server.start({
    cors: {
        credentials: true,
        origin: process.env.FRONTEND_URL,
    },
}, deets => {
    console.log(`Server now running on port http://localhost:${deets.port}}`);
})