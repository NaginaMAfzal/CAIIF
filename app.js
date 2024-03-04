/* eslint-disable func-names */
import express from 'express';
import cors from 'cors';
import status from 'http-status';
import morgan from 'morgan';
import compression from 'compression';
import passport from 'passport';
import dbConnection from './Connection/dbConnect';
import Router from './Routes/Router';
import errorHandler from './Middlewares/errorHandler';
import verifyToken from './Middlewares/verifyToken';
import AdminSchema from './Models/admin'
import userSchema from './Models/userSchema';
const bodyParser = require('body-parser');

dbConnection();

const app = express();

// initialize passport
app.use(passport.initialize());
app.use(passport.session());

app.use(morgan('dev'));
app.use(compression());
app.use(cors());
// app.use(
// 	express.urlencoded({
// 	extended: false,
// 	}),
// );

// will decode token from each request in {req.user}
app.use(verifyToken.verifyTokenSetUser);

// app.use(express.json());
// app.use(express.json({ limit: '14mb' })); // Adjust the limit as needed
// app.use(express.urlencoded({ extended: true, limit: '14mb' })); // Adjust the limit as needed
// Use built-in bodyParser for JSON and urlencoded data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

app.get('/', (req, res) => {
	res.status(status.OK).send({ Message: 'Connected', status: status.OK });
});

app.use('/api/v1/signup', Router.SignupRouter);

app.use('/api/v1/signin', Router.SigninRouter);

app.use('/api/v1/event', Router.EventRouter);

app.use('/api/v1/user', Router.userRouter);

app.use('/api/v1/admin', Router.adminRouter);

// i have implemented it in signup controller like this {next(new Error('Image is required'))}
app.use(errorHandler);

const fetchAndCheckUsers = async () => {
    try {
        // Fetch all users
        const users = await userSchema.find();

        // Check each user
        for (const user of users) {
            if (!user.verify && user.expirationTimestamp && isExpirationTimestampExpired(user.expirationTimestamp)) {
                // Update user status to approve: false
                user.approve = false;
                // Save the updated user
                await user.save();
            }
        }

    } catch (error) {
        console.error('Error fetching and checking users:', error);
    }
};

// Helper function to check if the expiration timestamp has expired
const isExpirationTimestampExpired = (timestamp) => {
    const currentTimestamp = Date.now();
    return currentTimestamp > timestamp;
};

// Set up setInterval to call fetchAndCheckUsers every hour (3600000 milliseconds)
setInterval(fetchAndCheckUsers, 300000);

const port = process.env.PORT || 5000;

app.listen(port, () =>
	console.log(`App listening On port http://localhost:${port}`),
);
