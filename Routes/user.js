import express from 'express';
import multer from 'multer';
import userevent from '../Controllers/userOp';
import userValidator from '../validations/user';
import middleware from '../Middlewares/loggedIn'
const storage = multer.memoryStorage();
const upload = multer({
	storage,
});
const userRouter = express.Router();

userRouter.post(
	'/verifyAccount/:gLink/:email',
	userevent.verifyAccount,
);

userRouter.post(
	'/enrolled/:cId',
	middleware.isLoggedIn,
	userevent.enrolledInCommittee,
)
userRouter.get(
	'/allCommittees',
	userevent.allCommittees
)

userRouter.get('/committeeById/:committeeId',
	userevent.committeeById,
)

userRouter.post('/createPassword',
	userevent.createPassword
)

userRouter.get('/paymentHistory',
	middleware.isLoggedIn,
	userevent.PaymentHistory)

userRouter.get('/userCommittee',
	middleware.isLoggedIn,
	userevent.userCommittee)

userRouter.get('/forgetPassword/:email',
	userevent.forgetPassword)

userRouter.post('/reqForCommittee', 
	middleware.isLoggedIn,
	userevent.reqForCommittee);


export default userRouter;
