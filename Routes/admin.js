import express from 'express';
import multer from 'multer';
import adminevent from '../Controllers/adminOp';
import userValidator from '../validations/user';
import middleware from '../Middlewares/isManager'

const storage = multer.memoryStorage();
const upload = multer({
	storage,
});
const adminRouter = express.Router();

adminRouter.post(
	'/approveAccount/:userId',
	middleware.isManagerOwner,
	adminevent.approveUser,
);

adminRouter.get('/getAllUsers',
	middleware.isManagerOwner,
	adminevent.allUser,
)
adminRouter.post('/createCommittee',
	middleware.isManagerOwner,
	adminevent.createCommittee,
)

adminRouter.get('/userById/:userId',
	middleware.isManagerOwner,
	adminevent.userById,
)

adminRouter.get('/committeeById/:committeeId',
	middleware.isManagerOwner,
	adminevent.committeeById,
)

adminRouter.get('/allCommittees',
	middleware.isManagerOwner,
	adminevent.allCommittees
)

adminRouter.post('/receivedStatus/:userId',
middleware.isManagerOwner,
adminevent.receivedStatus
)

adminRouter.post('/paymentRecord',
middleware.isManagerOwner,
adminevent.paymentRecord)

adminRouter.get('/PaymentHistory',
middleware.isManagerOwner,
adminevent.paymentHistory)

adminRouter.post('/additionalData/:userId',
middleware.isManagerOwner,
adminevent.additionalData)

adminRouter.get('/requestedUsers',
middleware.isManagerOwner,
adminevent.requestedUsers)

adminRouter.get('/userCommittee/:userId',
middleware.isManagerOwner,
adminevent.userCommittee)

adminRouter.post('/checkNumber',
middleware.isManagerOwner,
adminevent.checkNumber)

adminRouter.post('/removeUser',
middleware.isManagerOwner,
adminevent.removeUserFromCommittee)

adminRouter.get('/deleteUser/:userId',
middleware.isManagerOwner,
adminevent.deleteUser)

adminRouter.get('/deleteCommittee/:cId',
middleware.isManagerOwner,
adminevent.deleteCommittee)

adminRouter.post('/addMember',
middleware.isManagerOwner,
adminevent.addmember)

adminRouter.get('/getCommitteeNumbers/:cId',
middleware.isManagerOwner,
adminevent.getCommitteeNumbers)

export default adminRouter;
