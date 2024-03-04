import userSchema from '../Models/userSchema';
import Committee from '../Models/committee';
const crypto = require('crypto');
import bcryptjs from 'bcryptjs';
import generateUniqueId from 'generate-unique-id';
import committee from '../Models/committee';
import Payment from '../Models/payment';
import User from '../Models/userSchema'
import { ApiGatewayManagementApi } from 'aws-sdk';
import { escape } from 'querystring';
let sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const allUser = async (req, res) => {

    // Populate the committee data using the 'committeeList.cid' field
    const users = await userSchema.find({ $or: [{ block: false }, { block: { $exists: false } }] })
        .populate('committeeList.cid');

    if (users.length > 0) {
        // Do something with the fetched users
        res.status(200).json({ success: true, users, message: 'Users found successfully' });
    } else {
        res.status(400).json({ success: false, message: 'No users found with' });
    }
}

const requestedUsers = async (req, res) => {

    // const users = await userSchema.find({ block: false });

    const users = await userSchema.find({ approve: false });

    if (users.length > 0) {
        const totalUsers = users.length
        // Do something with the fetched users
        res.status(200).json({ success: true, totalUsers, message: 'length of requested users successfully' });
    } else {
        res.status(400).json({ success: false, message: 'No users found with' });
    }
}


const createCommittee = async (req, res) => {
    try {
        // Extract committee details from the request body
        const {
            name,
            amount,
            cycle,
            payment,
            startDate,
            endDate,
            members,
            uniqueId
        } = req.body;
        // Structure the cycle object
        const cycleObject = {
            type: cycle.type,
            value: cycle.value,
        };
        // Create a new Committee instance
        const newCommittee = new Committee({
            name,
            amount,
            cycle: cycleObject, // Pass an object, not another nested object
            payment,
            startDate,
            endDate,
            members,
            uniqueId
        });

        // Save the committee to the database
        const savedCommittee = await newCommittee.save();

        // Respond with the saved committee details
        res.status(200).json({ success: true, committee: savedCommittee, message: 'Committee saved successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error saving committee details' });
    }
}

function generateOTP() {
    // Generate a random 6-digit number and convert it to a string
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    return otp;
}

const approveUser = async (req, res) => {
    const userId = req.params.userId;
    const approve = req.body.approve;
    const cId = req.body.cId

    const user = await userSchema.findOne({ _id: userId });
    if (user) {
        if (!user.verify) {
            if (approve) {

                // Example usage
                const oneTimePassword = generateOTP();
                console.log('One-Time Password:', oneTimePassword);
                const hashedPassword = await bcryptjs.hash(oneTimePassword, 12);
                try {
                    const expirationTimeInHours = 24;
                    const expirationTimestamp = Date.now() + expirationTimeInHours * 60 * 60 * 1000; // Calculate the expiration timestamp (2 hours from now)
                    let time = new Date(expirationTimestamp).toLocaleString()
                    const gLink = generateUniqueId({ length: 9 });
                    const inviteLink = `https://caiif-committee.vercel.app/new-password/${gLink}/${user.email}`;
                    const msg = {
                        to: user.email,
                        from: 'Caiif Support <support@caiif.ca>',
                        subject: 'Your Caiif Committee Enrollment',
                        text: `Congratulations! Your request to join the Caiif Committee has been approved. Please use the following link to join Caiif Committee`,
                        html: `
                    <div style="font-family: 'Arial', sans-serif; padding: 20px; border-radius: 10px; background-color: #f8f8f8; color: #333;">
                        <h2 style="color: #004080;">Congratulations!</h2>
                        <p>Your details have successfully passed our verification process.</p>
                        <p> To move forward, kindly click on the provided link. When setting up your account, it's crucial to ensure the security of your information by choosing a robust and strong password.:</p>
                        <a href="${inviteLink}" style="color: #0066cc; text-decoration: underline; margin-top: 10px; display: block;">Proceed to set up your password</a>
                        <p>For any inquiries, contact us at <a href="mailto:support@caiif.ca" style="color: #0066cc;">support@caiif.ca</a> or call us at <a href="tel:+12895869810" style="color: #0066cc;">+1 (289) 586-9810</a>.</p>
                    </div>`,
                    };
                    // hello
                    await sgMail.send(msg);
                    user.approve = true;
                    user.gLink = gLink;
                    user.inviteStatus = true;

                    // Check if the user is not already in the committee.userIds array
                    if (!user.committeeList.some(item => item.cid.toString() === cId.toString())) {
                        // user.committeeList.push({ cid: cId, received: false });
                        user.committeeList[0].cid = cId; // or whatever value you want to set
                    }
                    user.expirationTimestamp = expirationTimestamp;

                    const committee = await Committee.findById(cId);
                    if (!committee.userIds || committee.userIds.length < committee.members) {
                        // Check if the user is not already in the committee.userIds array
                        if (!committee.userIds.includes(user._id)) {
                            committee.userIds.push(user._id);
                        }
                    }
                    else {
                        return res.status(507).json({ success: false, message: 'Enough space for enrollment in This Committee' });

                    }
                    await committee.save();

                    await user.save();
                    return res.status(200).json({ success: true, user, message: 'User Approved Successfully' });

                } catch (error) {
                    console.error('Error sending email:', error);
                    return res.status(500).json({ success: false, message: 'Failed to send email' });
                }
            }
            else {
                const rejoinLink = `https://caiif-committee.vercel.app/committe`;

                const msg = {
                    to: user.email,
                    from: 'Caiif Support <support@caiif.ca>',
                    subject: 'Important Notice',
                    text: `We appreciate your interest in our committee services at CAIIF. After careful consideration, we regret to inform you that we have chosen not to move forward with your application. Please stay tuned for future events and promotions. If you have any questions or need further assistance, please contact us at support@caiif.ca or call us at +1 (289) 586-9810.`,
                    html: `
                    <div style="font-family: 'Arial', sans-serif; padding: 20px; border-radius: 10px; background-color: #f8f8f8; color: #333;">
                        <h2 style="color: #ff3333;">Important Notice:</h2>
                        <p>Dear Caiif Committee Member,</p>
                        <p>We appreciate your interest in our committee services at CAIIF. After careful consideration, we regret to inform you that we have chosen not to move forward with your application.</p>
                        <p>We encourage you to stay tuned for future events and promotions, as we regularly organize new committee opportunities for our valued customers. Your continued support means a lot to us, and we hope to have the pleasure of your participation in our upcoming committee.</p>
                        <p>If you have any questions or need further assistance, please contact us at <a href="mailto:support@caiif.ca" style="color: #0066cc;">support@caiif.ca</a> or call us at <a href="tel:+12895869810" style="color: #0066cc;">+1 (289) 586-9810</a>.</p>
                    </div>`
                };
                await sgMail.send(msg);
                // If the email is sent successfully, delete the user
                await user.delete();
                // await user.save();
                return res.status(200).json({ success: true, message: 'Account deleted Successfully' });
            }
        }
        else {
            const committee = await Committee.findById({ _id: cId })
            if (!committee.userIds || committee.userIds.length < committee.members) {
                if (approve) {
                    try {
                        const inviteLink = `https://caiif.ca/dashboard`
                        const msg = {
                            to: user.email,
                            from: 'Caiif Support <support@caiif.ca>',
                            subject: 'Congratulations! Your Caiif Committee Enrollment Has Been Approved',
                            text: `Congratulations! Your request to join the Caiif Committee has been approved. Please use the following link to join Caiif Committee.`,
                            html: `
                            <div style="font-family: 'Arial', sans-serif; padding: 20px; border-radius: 10px; background-color: #f8f8f8; color: #333; max-width: 600px; margin: 0 auto;">
                                <h2 style="color: #004080;">Congratulations!</h2>
                                <p>Your request to join the Another Caiif Committee has been approved.</p>
                                <p>Please click on the following link for more details:</p>
                                <a href="${inviteLink}" style="display: inline-block; padding: 10px 20px; background-color: #0066cc; color: #fff; text-decoration: none; border-radius: 5px; margin-top: 10px;">Visit Caiif Committee</a>
                                
                                <p>You are successfully enrolled in <strong>${committee.name}</strong></p>
                                
                                <p>If you have any inquiries, feel free to contact us:</p>
                                <p>Email: <a href="mailto:support@caiif.ca" style="color: #0066cc;">support@caiif.ca</a></p>
                                <p>Phone: <a href="tel:+12895869810" style="color: #0066cc;">+1 (289) 586-9810</a></p>
                                <p style="margin-top: 20px; font-size: 0.8em; color: #888;">This email is sent by Caiif Support. Please do not reply to this email.</p>
                            </div>`,
                        };
                        await sgMail.send(msg);
                        user.approve = true
                        if (!user.committeeList.some(item => item.cid.toString() === cId.toString())) {
                            const lastIndex = user.committeeList.length - 1;
                            if (lastIndex >= 0) {
                                // Update the cid at the last index
                                user.committeeList[lastIndex].cid = cId; // or whatever value you want to set
                            }
                        }
                        committee.userIds.push(userId);
                        await committee.save();

                        await user.save();
                        return res.status(200).json({ success: true, user, message: 'User Approved Successfully' });
                    }
                    catch (error) {
                        console.error('Error sending email:', error);
                        return res.status(500).json({ success: false, message: 'Failed to send email' });
                    }
                }
                else {

                    const msg = {
                        to: user.email,
                        from: 'Caiif Support <support@caiif.ca>',
                        subject: 'Notice: Caiif Committee Enrollment Declined',
                        html: `
                        <div style="font-family: 'Arial', sans-serif; padding: 20px; border-radius: 10px; background-color: #f8f8f8; color: #333; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #ff3333;">Important Notice:</h2>
                            <p>Dear Caiif Committee Member,</p>
                            <p>We regret to inform you that your request to join another Caiif committee has been declined or canceled by the admin.</p>
                            <p>You can consider applying for another committee in the future. We appreciate your interest and support. If you have any questions, please feel free to contact us.</p>
                            <p>Email: <a href="mailto:support@caiif.ca" style="color: #0066cc;">support@caiif.ca</a></p>
                            <p>Phone: <a href="tel:+12895869810" style="color: #0066cc;">+1 (289) 586-9810</a></p>
                            <p style="margin-top: 20px; font-size: 0.8em; color: #888;">This email is sent by Caiif Support. Please do not reply to this email.</p>
                        </div>`
                    };

                    await sgMail.send(msg);
                    // If the email is sent successfully, delete the user
                    // Check if the user is not already in the committee.userIds array
                    const lastIndex = user.committeeList.length - 1;
                    if (lastIndex >= 0) {
                        // Remove the last item from the committeeList array
                        user.committeeList.pop();
                    }
                    await user.save();
                    return res.status(200).json({ success: true, message: 'Request Deny successfully' });
                }
            }
            else {
                return res.status(400).json({ success: false, message: "committee is full please select another committee" })
            }
        }
    }
    else {
        return res.status(400).json({ success: false, message: 'User not found' });

    }
}

const approveUserold = async (req, res) => {
    const userId = req.params.userId;
    const approve = req.body.approve;

    const user = await userSchema.findOne({ _id: userId });
    if (user) {

        if (approve) {
            user.approve = true;
            user.verify = true
            await user.save();
            return res.status(200).json({ success: true, user, message: 'User Approved Successfully' });

        }
        else {
            user.verify = false;
            await user.save();
            res.status(200).json({ success: true, user, message: 'Account Blocked Successfully' });
        }
    }
    else {
        return res.status(400).json({ success: false, message: 'User not found' });

    }
}

const userById = async (req, res) => {
    try {
        const userId = req.params.userId;

        const user = await userSchema.findOne({ _id: userId }).populate('committeeList.cid');
        if (user) {
            return res.status(200).json({ success: true, user, message: 'User detail fetched Successfully' });

        }
        else {
            return res.status(400).json({ success: false, message: 'User not found' });

        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Error saving committee details' });
    }
}

const allCommittees = async (req, res) => {
    try {
        const allCommittees = [];

        const committees = await Committee.find();

        if (committees) {
            for (const committee of committees) {

                let committeeDetails = {
                    committee: committee,
                    enrolledUsers: [],
                    receivedUsers: [],
                    Active: false
                }; if (committee.userIds && committee.userIds.length > 0) {
                    for (let userId of committee.userIds) {
                        const userDetails = await userSchema
                            .findById(userId)
                            .select('firstName lastName email contactNumber jobOccupation level recieveList committeeList userType createdAt')
                            .lean();
                        if (userDetails) {
                            committeeDetails.enrolledUsers.push(userDetails);
                        }
                    }
                }

                if (committee.recievedBy && committee.recievedBy.length > 0) {
                    for (let userId of committee.recievedBy) {
                        const userDetails = await userSchema
                            .findById(userId)
                            .select('firstName lastName email contactNumber jobOccupation level recieveList committeeList userType createdAt')
                            .lean(); if (userDetails) {
                                committeeDetails.receivedUsers.push(userDetails);
                            }
                    }
                }

                allCommittees.push({ committeeDetails })

            }

            return res.status(200).json({ success: true, allCommittees, message: 'Committees found successfully' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};


const committeeById = async (req, res) => {
    try {
        let data = {
            committee: [],
            enrolledUsers: [],
            receivedUsers: []
        }
        const userId = req.params.committeeId;

        const committee = await Committee.findOne({ _id: userId });
        if (committee) {
            data.committee = committee
            if (committee.userIds && committee.userIds.length > 0) {
                for (let userid of committee.userIds) {
                    const userDetails = await userSchema
                        .findById(userid)
                        .select('firstName lastName email contactNumber jobOccupation level recieveList committeeList userType createdAt')
                        .lean();
                    if (userDetails) {
                        data.enrolledUsers.push(userDetails)
                    }
                }
            }
            if (committee.recievedBy && committee.recievedBy.length > 0) {
                for (let userid of committee.recievedBy) {
                    const userDetails = await userSchema
                        .findById(userid)
                        .select('firstName lastName email contactNumber jobOccupation level recieveList committeeList userType createdAt')
                        .lean(); if (userDetails) {
                            data.receivedUsers.push(userDetails)
                        }
                }
            }
            return res.status(200).json({ success: true, data, message: 'User detail fetched Successfully' });

        }
        else {
            return res.status(400).json({ success: false, message: 'User not found' });

        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Error saving committee details' });
    }
}

const userCommittee = async (req, res) => {
    const userId = req.params.userId;
    try {
        const user = await userSchema.findById({ _id: userId }).populate('committeeList.cid');

        if (user) {
            return res.status(200).json({ success: true, user, message: 'User fetched Successfully' });
        }
        else {
            return res.status(400).json({ success: false, message: 'User Not Found' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error: error, message: 'Error fetching committee details' });
    }
}

const receivedStatus = async (req, res) => {

    const userId = req.params.userId
    const received = req.body.received
    const cId = req.body.cId
    const committee = await Committee.findById({ _id: cId })

    const user = await userSchema.findById({ _id: userId });
    if (user) {
        // Find the time entry containing the screenshot
        const committeeIndex = user.committeeList.findIndex((cid) => {
            return cid.cid.toString() === cId;
        })
        if (committeeIndex !== -1) {
            const idofCommittee = user.committeeList[committeeIndex].cid;
            user.committeeList[committeeIndex].received = received;

            if (received) {

                // Find the time entry containing the screenshot
                const receivedIndex = committee.recievedBy.findIndex((cid) => {
                    return cid._id.toString() === userId;
                })
                if (receivedIndex === -1) {
                    committee.recievedBy.push(userId)
                }
            } else {
                const indexToRemove = committee.recievedBy.indexOf(userId);

                if (indexToRemove !== -1) {
                    committee.recievedBy.splice(indexToRemove, 1);
                }
            }

            await committee.save()
            await user.save();
            return res.status(200).json({ success: true, user, message: 'Received Status Updated Successfully' });

        }
    };
}

const paymentRecord = async (req, res) => {
    try {
        const { cid, paymentAmount, isPaid, date, userId, note } = req.body

        const committee = await Committee.findById({ _id: cid })
        if (committee) {
            if (isPaid == "PAYOUT") {
                // Find the time entry containing the userId
                const receivedIndex = committee.recievedBy.findIndex((cid) => {
                    return cid._id.toString() === userId;
                })
                if (receivedIndex === -1) {
                    committee.recievedBy.push(userId)
                }
                else {
                    return res.status(409).json({ success: false, message: "This user Already Paid Off" })
                }

                // update user status payout 
                const user = await userSchema.findById({ _id: userId });
                // Find the committeeindex containing the cid
                const cindex = user.committeeList.findIndex((committee) => {
                    return committee.cid.toString() === cid;
                })
                if (cindex !== -1) {
                    user.committeeList[cindex].received = true
                }
                else {
                    return res.status(409).json({ success: false, message: "User IS not enrolled in committee" })
                }
                await committee.save()
                await user.save()
            }

            const newPayment = new Payment({
                cid, paymentAmount, isPaid, date, userId, note
            })
            const savedAmount = await newPayment.save()
            return res.status(200).json({ success: true, savedAmount, message: 'Record saved successfully' });
        }
        else {
            return res.status(404).json({ success: false, message: "Committee not found" })
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Something went wrong' });
    }
}

const paymentHistory = async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate({
                path: 'userId',
                select: 'firstName lastName email contactNumber jobOccupation level recieveList committeeList userType createdAt'
            })
            .populate('cid'); // Populate the committeeData field

        if (payments && payments.length > 0) {
            return res.status(200).json({
                success: true,
                payments,
                message: 'Payment History Fetched successfully'
            });
        } else {
            return res.status(404).json({
                success: false,
                message: 'No payments found'
            });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong'
        });
    }
};

const additionalDataold = async (req, res) => {
    try {
        const userId = req.params.userId;
        const adminNotes = req.body.adminNotes;

        const user = await userSchema.findById({ _id: userId })
        if (user) {
            // Push the new admin note to the adminNotes array
            user.adminNotes.push(adminNotes);

            const savedUser = await user.save();
            res.status(200).json({
                success: true,
                savedUser,
                message: 'Record Updated successfully',
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Something went wrong'
        });
    }
}

const additionalData = async (req, res, next) => {
    try {
        const userId = req.params.userId;
        const updateFields = req.body;

        const user = await userSchema.findById({ _id: userId });
        if (user) {
            for (const key of Object.keys(updateFields)) {
                // Update the field with the new value
                user[key] = updateFields[key];

                if (key === 'cId') {
                    // Assuming updateFields[key] is an array of committee objects
                    const newCommitteeObjects = Array.isArray(updateFields[key]) ? updateFields[key] : [updateFields[key]];

                    // Find the committees whose IDs do not match any of the new IDs
                    const committeesToRemoveUser = user.committeeList.filter(item => !newCommitteeObjects.some(newCommitteeObj => item.cid.toString() === newCommitteeObj.cid.toString()));

                    await Promise.all(committeesToRemoveUser.map(async committeeToRemoveUser => {
                        const committee = await Committee.findOne({ _id: committeeToRemoveUser.cid });
                        if (committee) {
                            const userIndex = committee.userIds.indexOf(user._id);
                            if (userIndex !== -1) {
                                committee.userIds.splice(userIndex, 1);
                                await committee.save();
                            }
                        }
                    }));

                    user.committeeList = [];

                    newCommitteeObjects.forEach(newCommitteeObj => {
                        const newCommittee = {
                            cid: newCommitteeObj.cid,
                            received: false,
                            committeeNumber: newCommitteeObj.committeeNumber
                            // Add other properties as needed
                        };
                        user.committeeList.push(newCommittee);
                    });

                    // await Promise.all(newCommitteeObjects.map(async newCommitteeObj => {
                    //     const committee = await Committee.findById(newCommitteeObj.cid);
                    //     if (user.approve && committee) {
                    //         if (!committee.userIds || committee.userIds.length < committee.members) {
                    //             if (!committee.userIds.includes(user._id)) {
                    //                 committee.userIds.push(user._id);
                    //             }
                    //         }
                    //         await committee.save();
                    //     }
                    // }));
                    for (const newCommitteeObj of newCommitteeObjects) {
                        const committee = await Committee.findById(newCommitteeObj.cid);

                        if (user.approve && committee) {
                            // Remove all occurrences of user ID in committee.userIds
                            committee.userIds = committee.userIds.filter(userId =>
                                userId.toString() !== user._id.toString()
                            );

                            // Append the user ID to the committee.userIds array based on the occurrences in newCommitteeObjects
                            const occurrences = newCommitteeObjects.filter(obj => obj.cid === newCommitteeObj.cid).length;
                            for (let i = 0; i < occurrences; i++) {
                                if (!committee.userIds || committee.userIds.length < committee.members) {
                                    committee.userIds.push(user._id);
                                }
                            }
                            // Save the committee after all operations
                            await committee.save();
                        }
                    }
                }

                if (key === 'adminNote') {
                    const newAdminNotes = updateFields['adminNote'].filter(entry => entry.note && entry.note.trim() !== '');
                    user.adminNotes = newAdminNotes;
                }
            }

            const savedUser = await user.save();
            return res.status(200).json({
                success: true,
                savedUser,
                message: 'Record Updated successfully',
            });
        } else {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false, error, message: 'Failed to update user'
        });
    }
};

const additionalDatamy = async (req, res, next) => {
    try {
        const userId = req.params.userId;
        const updateFields = req.body;

        const user = await userSchema.findById({ _id: userId })
        if (user) {
            Object.keys(updateFields).forEach(async (key) => {

                // Update the field with the new value
                user[key] = updateFields[key];
                if (key == 'cId') {
                    // Find the index of the committee in the committeeList
                    const existingCommittee = user.committeeList.find(item => item.cid.toString() === updateFields[key].toString());

                    if (existingCommittee) {
                        // Update the committeeNumber if the committee already exists
                        existingCommittee.committeeNumber = updateFields['committeeNumber'] || 0;
                    } else {
                        // If the committee does not exist, push it to the committeeList
                        const committeeNumber = updateFields['committeeNumber'] || 0;
                        // user.committeeList.push({ cid: updateFields[key], received: false, committeeNumber });
                        user.committeeList[0].cid = updateFields[key];
                    }

                    const committee = await Committee.findById(updateFields[key]);

                    if (user.approve) {
                        if (!committee.userIds || committee.userIds.length < committee.members) {
                            // Check if the user is not already in the committee.userIds array
                            if (!committee.userIds.includes(user._id)) {
                                committee.userIds.push(user._id);
                            }
                        }
                        else {
                            return res.status(507).json({ success: false, message: 'Committee is Already full' });

                        }
                    }
                    await committee.save();

                }
                if (key === 'adminNote') {
                    const newAdminNotes = updateFields['adminNote']
                        .filter(entry => entry.note && entry.note.trim() !== '');  // Filter out objects with null or empty note properties

                    // If there are valid admin notes, update the user's adminNotes array
                    // if (newAdminNotes.length > 0) {
                    user.adminNotes = newAdminNotes;
                    // }
                }
            });

            const savedUser = await user.save();
            return res.status(200).json({
                success: true,
                savedUser,
                message: 'Record Updated successfully',
            });
        }
        else {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false, error, message: 'Failed to update user'
        });
    }
};

const checkNumber = async (req, res) => {
    try {

        const committeeNumber = req.body.committeeNumber;
        const committeeId = req.body.cId;

        // Find the user based on the provided committeeId and committeeNumber
        const user = await User.findOne({
            'committeeList.cid': committeeId,
            'committeeList.committeeNumber': committeeNumber
        });

        if (user) {
            return res.status(200).json({
                success: true,
                user,
                message: 'This Committee Number is not available.'
            });
        } else {
            return res.status(404).json({
                success: false,
                message: 'This Committee Number available.'
            });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            error,
            message: 'Error checking committeeNumber.'
        });
    }
};

const removeUserFromCommittee = async (req, res) => {
    const cId = req.body.cId
    const userId = req.body.userId

    const user = await userSchema.findById({ _d: userId })
    if (user) {

        const cindex = user.committeeList.findIndex((cid) => {
            return cid.cid.toString() == cId;
        })
        if (cindex !== -1) {
            user.committeeList.splice(cindex, 1)
            user.save()

        }
        const committee = await Committee.findById({ _id: cId });

        if (committee) {
            const index = committee.userIds.findIndex(id => id.toString() === userId); // Use a callback function
            if (index !== -1) {
                committee.userIds.splice(index, 1)
                committee.save()
            }
        }
        return res.status(200).json({ success: true, user, message: "User Successfully removed from Committee " })
    }
    else {
        return res.status(404).json({ success: false, message: "User Not found" })
    }
}

const deleteUser = async (req, res) => {

    const userId = req.params.userId

    try {
        // Assuming committeeSchema is your Mongoose model for committees
        const committees = await Committee.find({ userIds: userId });

        for (const committee of committees) {
            const index = committee.userIds.findIndex(id => id.toString() === userId); // Use a callback function
            if (index !== -1) {
                committee.userIds.splice(index, 1)
                committee.save()
            }
        }
        // Assuming userSchema is your Mongoose model for users
        const result = await userSchema.deleteOne({ _id: userId });

        if (result.deletedCount === 1) {
            console.log('User deleted successfully');
            // Do something with the fetched committees
            return res.status(200).json({ success: true, message: "User deleted Successfully" })
        }
        else {
            return res.status(404).json({ success: false, message: "User Not Found" })
        }
    } catch (error) {
        console.error('Error fetching committees:', error);
    }
}

const deleteCommittee = async (req, res) => {

    const cId = req.params.cId;
    try {
        const users = await userSchema.find({ 'committeeList.cid': cId });

        for (const user of users) {
            const index = user.committeeList.findIndex((cid => cid.cid.toString() === cId))
            if (index !== -1) {
                user.committeeList.splice(index, 1)
                user.save()
            }
        }
        const deleteC = await Committee.deleteOne({ _id: cId });
        if (deleteC.deletedCount === 1) {
            return res.status(200).json({ success: true, message: "Committee deleted Successfully" })
        }
        else {
            return res.status(404).json({ success: false, message: "Committee not found" })
        }
    } catch (error) {
        console.error('Error deleting committees:', error);
    }
}

const addmember = async (req, res) => {

    try {

        const {
            cId, firstName, lastName, email, contactNumber,
            emergencyContact, sin, nic, userType,
            residentialStatus, jobOccupation, grossAnnualIncome, sourceOfIncome,
            employmentStatus, appointment,
            DOB, address1, address2, city, province, postalCode,
        } = req.body;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Regular expression for basic email format validation

        // Check if the provided email matches the expected format
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        const existingUserByEmail = await userSchema.findOne({ email: { $regex: new RegExp(email, 'i') }, });
        const existingUserByContactNumber = await userSchema.findOne({ contactNumber });

        if (!existingUserByEmail && !existingUserByContactNumber) {

            const DOBobj = DOB.day + "-" + DOB.month + "-" + DOB.year

            const appointmentObject = {
                date: null
            };

            if (appointment && appointment.date) {
                appointmentObject.date = appointment.date
            }

            // Save user data to the database
            const newUser = new userSchema({
                firstName,
                lastName,
                email,
                contactNumber,
                emergencyContact,
                sin,
                nic,
                userType: userType, // Assuming you want both values
                residentialStatus,
                jobOccupation,
                grossAnnualIncome,
                sourceOfIncome,
                employmentStatus,
                appointment: appointmentObject,
                DOB: DOBobj,
                address1,
                address2,
                city,
                province,
                postalCode,
                approve: true
            });

            const committee = await Committee.findById(cId);

            // Check if the committee exists
            if (!committee) {
                return res.status(404).json({ success: false, message: 'Committee not found' });
            }

            ///approve scene
            try {
                const expirationTimeInHours = 24;
                const expirationTimestamp = Date.now() + expirationTimeInHours * 60 * 60 * 1000; // Calculate the expiration timestamp (2 hours from now)

                const gLink = generateUniqueId({ length: 9 });
                const inviteLink = `https://caiif-committee.vercel.app/new-password/${gLink}/${email}`;
                const msg = {
                    to: email,
                    from: 'Caiif Support <support@caiif.ca>',
                    subject: 'Your Caiif Committee Enrollment',
                    text: `Congratulations! You Are successfully enrolled in Caiif Committee. Please use the following link to join Caiif Committee`,
                    html: `
                    <div style="font-family: 'Arial', sans-serif; padding: 20px; border-radius: 10px; background-color: #f8f8f8; color: #333;">
                        <h2 style="color: #004080;">Congratulations!</h2>
                        <p>You Are successfully enrolled in Caiif Committee.</p>
                        <p>Please click on the following link to verify Your Account and to verify Your Account and join the Caiif Committee:</p>
                        <a href="${inviteLink}" style="display: inline-block; padding: 10px 20px; background-color: #0066cc; color: #fff; text-decoration: none; border-radius: 5px; margin-top: 10px;">Join Caiif Committee</a>
                        <p><strong>Note:</strong> This link will expire after 24 hours. Please access the link before ${new Date(expirationTimestamp).toLocaleString()}.</p>
                        <p>For any inquiries, contact us at <a href="mailto:support@caiif.ca" style="color: #0066cc;">support@caiif.ca</a> or call us at <a href="tel:+12895869810" style="color: #0066cc;">+1 (289) 586-9810</a>.</p>
                    </div>`,
                };
                // hello
                await sgMail.send(msg);
                newUser.gLink = gLink;
                newUser.committeeList.push({ cid: committee._id, received: false });

                newUser.inviteStatus = true;

                newUser.expirationTimestamp = expirationTimestamp;

                const savedUser = await newUser.save();

                if (!committee.userIds || committee.userIds.length < committee.members) {
                    // Check if the user is not already in the committee.userIds array
                    if (!committee.userIds.includes(savedUser._id)) {
                        committee.userIds.push(savedUser._id);
                    }
                }
                else {
                    return res.status(507).json({ success: false, message: 'Enough space for enrollment in This Committee' });

                }
                await committee.save();

                return res.status(200).json({ success: true, savedUser, message: 'User Approved Successfully' });

            } catch (error) {
                console.error('Error sending email:', error);
                return res.status(500).json({ success: false, message: 'Failed to send email' });
            }
        }
        else {
            return res.status(400).json({
                success: false,
                message: existingUserByEmail ? 'Email Already Taken.' : 'Contact Number Already Taken.',
            });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Something went wrong' });
    }
}

const getCommitteeNumbers = async (req, res) => {
    const cId = req.params.cId

    try {
        // Find users with committeeList[indexes].cid equal to cId
        const users = await userSchema.find({ 'committeeList.cid': cId });

        // Iterate through users to find the committeeNumber for the matching committeeList[foundcId]
        const committeeNumbers = users.flatMap(user => {
            return user.committeeList
                .filter(committee => committee.cid.toString() === cId)
                .map(committee => committee.committeeNumber);
        });

        // Original array of numbers
        const numbers = ['1', '2', '3', '4', '5', '6', '7', '8'];

        // Calculate available numbers by subtracting committeeNumbers
        const availableNumbers = numbers.filter(number => !committeeNumbers.includes(number));
        availableNumbers.unshift('0')

        // Respond with the availableNumbers
        return res.status(200).json({ success: true, message: "Available Committee Numbers", availableNumbers });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Internal Server Error');
    }
};

export default {
    approveUser, allUser, createCommittee, userById, committeeById, allCommittees, receivedStatus, paymentRecord, paymentHistory,
    additionalData, requestedUsers, requestedUsers, userCommittee, checkNumber, removeUserFromCommittee, deleteUser, deleteCommittee, addmember,
    getCommitteeNumbers
}