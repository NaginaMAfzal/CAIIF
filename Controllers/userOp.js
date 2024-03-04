import committee from '../Models/committee';
import Committee from '../Models/committee';
import Payment from '../Models/payment';
import userSchema from '../Models/userSchema';
import bcryptjs from 'bcryptjs';
import generateUniqueId from 'generate-unique-id';
let sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

import jwt from 'jsonwebtoken';

const createToken = (user, res, next) => {
    const { id, email, name, imageUrl, userType, verify } = user;
    const payload = {
        _id: id,
        email,
        name,
        imageUrl,
        userType,
        verify,
    };
    console.log(payload);
    // create a token
    jwt.sign(
        payload,
        process.env.JwtSecret,
        {
            expiresIn: '365d',
        },
        (err, token) => {
            // Error Create the Token
            if (err) {
                return res.status(500);
                next(new Error('Unable to generate Token.'));
            } else {
                // Token Created
                res.json({
                    token,
                });
            }
        },
    );
};

const verifyAccount = async (req, res) => {
    const gLink = req.params.gLink;
    const email = req.params.email;

    const user = await userSchema.findOne({
        email: { $regex: new RegExp(email, 'i') },
        gLink: gLink,
        inviteStatus: true
    });
    if (user) {

        const currentTimestamp = Date.now();
        if (currentTimestamp > user.expirationTimestamp) {
            // The link has expired
            return res.status(403).json({ success: false, message: 'Invite link expired' });
        }
        else {
            user.verify = true;
            user.inviteStatus = false;
            await user.save();
            return res.status(200).json({ success: true, user, message: 'Account Verified Successfully' });
        }
    }
    else {
        return res.status(400).json({ success: false, message: 'Invalid invite link' });
    }
}

const enrolledInCommittee = async (req, res) => {
    try {
        const { cId } = req.params; // Assuming cId is the committee ID
        const user = await userSchema.findOne({ _id: req.user._id })

        // Find the committee by ID
        const committee = await Committee.findById(cId);

        // Check if the committee exists
        if (!committee) {
            return res.status(404).json({ success: false, message: 'Committee not found' });
        }

        // Check if committee.userIds is defined and req.user._id already exists in committee.userIds[]
        const isUserAlreadyEnrolled = committee.userIds && committee.userIds.includes(req.user._id);

        // Check if the number of users in userIds is less than members
        if (user && !isUserAlreadyEnrolled) {
            if (!committee.userIds || committee.userIds.length < committee.members) {
                // Push a new object with the desired properties to the committeeList array
                user.committeeList.push({ cid: committee._id, received: false });
                committee.userIds.push(req.user._id);
                await committee.save();
                await user.save()

                return res.status(200).json({ success: true, message: 'Enrolled in committee successfully' });
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Sorry Members are completed in this Committee',
                });
            }

        } else {
            return res.status(400).json({
                success: false,
                message: 'User is already enrolled or the committee is full',
            });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const allCommittees = async (req, res) => {
    try {
        // const user = await userSchema.findOne({ _id: req.user._id })

        const allCommittees = {
            level1: [],
            level2: [],
            level3: []
        }; const committees = await Committee.find()
        if (committees) {
            // for (const committee of committees) {
            //     if (!committee.userIds || committee.userIds.length < committee.members) {

            //         if (committee.payment == 1000) {
            //             allCommittees.level1.push({ committee, Active: false });
            //         } else if (committee.payment == 3000) {
            //             allCommittees.level2.push({ committee, Active: false });
            //         } else if (committee.payment == 5000) {
            //             allCommittees.level3.push({ committee, Active: false });
            //         }
            //     }
            // }
            return res.status(200).json({ success: true, committees, message: 'Committees found successfully' });

        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }

}

const createPassword = async (req, res, next) => {
    let userId = req.body.userId
    let newPassword = req.body.newPassword;
    const user = await userSchema.findOne({ _id: userId, verify: true })
    if (user) {
        const hashedPassword = await bcryptjs.hash(newPassword, 12);
        user.password = hashedPassword
        let savedUser = await user.save();
        // Generate a new JWT token
        createToken(savedUser, res, next);
    }
    else {
        return res.status(400).json({ success: false, message: 'User not found' });

    }
}

const committeeById = async (req, res) => {
    try {
        let data = {
            committee: [],
            enrolledusers: [],
            receivedUsers: []
        }
        const committeeId = req.params.committeeId;

        const committee = await Committee.findOne({ _id: committeeId });
        data.committee = committee
        if (committee) {
            if (committee.userIds && committee.userIds.length > 0) {

                for (let userid of committee.userIds) {
                    const userDetails = await userSchema
                        .findById(userid)
                        .select('firstName lastName email contactNumber jobOccupation level recieveList committeeList userType createdAt')
                        .lean();
                    if (userDetails) {
                        data.enrolledusers.push(userDetails);
                    }
                }
            }
            if (committee.recievedBy && committee.recievedBy.length > 0) {
                for (let userid of committee.recievedBy) {
                    const userDetails = await userSchema
                        .findById(userid)
                        .select('firstName lastName email contactNumber jobOccupation level recieveList committeeList userType createdAt')
                        .lean();
                    if (userDetails) {
                        data.receivedUsers.push(userDetails);
                    }
                }

            }
            return res.status(200).json({ success: true, data, message: 'Committee detail fetched Successfully' });
        }
        else {
            return res.status(400).json({ success: false, message: 'Committee not found' });

        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error: error, message: 'Error fetching committee details' });
    }
}

const PaymentHistory = async (req, res) => {

    const userId = req.user._id;

    const payments = await Payment.find({ userId: userId })
        .populate({
            path: 'userId',
            select: 'firstName lastName email contactNumber jobOccupation level recieveList committeeList userType createdAt'
        })
        .populate('cid'); // Populate the committeeData field

    if (payments.length > 0) {
        return res.status(200).json({ message: 'Payments for the user retrieved successfully', data: payments });
    } else {
        return res.status(404).json({ message: 'No payments found for the user' });
    }
}

const userCommittee = async (req, res) => {
    try {
        const user = await userSchema.findById({ _id: req.user._id })
        const data = {
            committees: []
        };

        if (user.committeeList && user.committeeList.length > 0) {
            for (const cid of user.committeeList) {
                // Find the committee by its ID
                const committee = await Committee.findOne({ _id: cid.cid });
                if (committee) {
                    // Fetch enrolled users for the committee
                    const enrolledUsers = [];
                    // Fetch recieved users for the committee
                    const receivedUsers = [];
                    if (committee.userIds && committee.userIds.length > 0) {
                        for (const userId of committee.userIds) {
                            const userDetails = await userSchema
                                .findById(userId)
                                .select('firstName lastName email contactNumber jobOccupation level recieveList committeeList userType createdAt')
                                .lean();
                            if (userDetails) {
                                enrolledUsers.push(userDetails);
                            }
                        }
                    }
                    if (committee.recievedBy && committee.recievedBy.length > 0) {
                        for (let userid of committee.recievedBy) {
                            const userDetails = await userSchema
                                .findById(userid)
                                .select('firstName lastName email contactNumber jobOccupation level recieveList committeeList userType createdAt')
                                .lean();
                            if (userDetails) {
                                receivedUsers.push(userDetails);
                            }
                        }
                    }
                    data.committees.push({ committee, enrolledUsers, receivedUsers });
                }
            }
            return res.status(200).json({ success: true, data, message: 'Committees fetched Successfully' });
        }
        else {
            return res.status(400).json({ success: false, message: 'Committees Not Found' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error: error, message: 'Error fetching committee details' });
    }
}

const forgetPassword = async (req, res) => {

    const email = req.params.email
    // Example usage
    const user = await userSchema.findOne({ email: { $regex: new RegExp(email, 'i') }, verify: true });
    if (user) {
        try {
            const expirationTimeInHours = 24;
            const expirationTimestamp = Date.now() + expirationTimeInHours * 60 * 60 * 1000; // Calculate the expiration timestamp (2 hours from now)

            const gLink = generateUniqueId({ length: 9 });
            const inviteLink = `https://caiif-committee.vercel.app/new-password/${gLink}/${email}`;
            const msg = {
                to: email,
                from: 'Caiif Support <support@caiif.ca>',
                subject: 'Account Verification Link',
                text: `To verify your account, please click on the following link: ${inviteLink}`,
                html: `
                <div style="font-family: 'Arial', sans-serif; padding: 20px; border-radius: 10px; background-color: #f8f8f8; color: #333;">
                    <h2 style="color: #004080;">Account Verification</h2>
                    <p>Welcome to Caiif Committee!</p>
                    <p>To verify your account, please click on the following link:</p>
                    <a href="${inviteLink}" style="display: inline-block; padding: 10px 20px; background-color: #0066cc; color: #fff; text-decoration: none; border-radius: 5px; margin-top: 10px;">Verify Account</a>
                    <p><strong>Note:</strong> This link will expire after 24 hours. Please access the link before <strong>${new Date(expirationTimestamp).toLocaleString()}</strong>.</p>
                    <p>If you have any questions or need further assistance, please contact us at <a href="mailto:support@caiif.ca" style="color: #0066cc;">support@caiif.ca</a> or call us at <a href="tel:+12895869810" style="color: #0066cc;">+1 (289) 586-9810</a>.</p>
                </div>`,
            };

            await sgMail.send(msg);
            user.gLink = gLink;
            user.inviteStatus = true;

            await user.save();
            return res.status(200).json({ success: true, user, message: 'forget password Link send successfully ' });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error, message: 'Error sending verification email' });
        }
    } else {
        return res.status(404).json({ success: false, message: 'Invalid Email Not Found' });
    }

}

const reqForCommittee = async (req, res) => {
    console.log("hello");
    const cId = req.body.cId;

    const committee = await Committee.findById({ _id: cId })

    if (committee) {
        const user = await userSchema.findById({ _id: req.user._id })
        if (user.verify) {
            if(user.approve){
            user.committeeList.push({ cid: cId, received: false })
            user.approve = false
            const newUser = await user.save()
            return res.status(200).json({ success: true, newUser, message: "Request successfully send for enrolment in committee" })
            }
            else{
                return res.status(202).json({success: false, message: "Your Request is already in Process"})
            }
        }
    }
    else {
        return res.status(404).json({ success: false, mes: "committee Not found" })
    }
}

export default { verifyAccount, enrolledInCommittee, allCommittees, committeeById, createPassword, PaymentHistory, userCommittee, forgetPassword, reqForCommittee }