const cookieParser = require('cookie-parse');

require('dotenv').config({ path: 'variables.env' });
const createServer = require('./createServer');
const db = require('./db');

const server = createServer();

// TODO - use express middlware to handle cookies (JWT)
server.express.use(cookieParser());
// TODO - use express middlware to populate current user\

server.start({
    cors: {
        credentials: true,
        origin: process.env.FRONTEND_URL,
    },
}, deets => {
    console.log(`Server now running on port http://localhost:${deets.port}}`);
})