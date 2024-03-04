import bcryptjs from 'bcryptjs';
import awsHandler from './aws';
import generateUniqueId from 'generate-unique-id';
import userSchema from '../Models/userSchema';
const nodemailer = require('nodemailer');
import Committee from '../Models/committee'
require('dotenv').config();

// sgMail.setApiKey(process.env.SENDGRID_API_KEY); // Set your SendGrid API key
// Attempt to use dynamic import for ESM syntax
console.log(process.env.SENDGRID_API_KEY);
let sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const userSignUp = async (req, res, next) => {
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

		const existingUserByEmail = await userSchema.findOne({ 	email: { $regex: new RegExp(email, 'i') },	});
		const existingUserByContactNumber = await userSchema.findOne({ contactNumber });
		

		if (!existingUserByEmail && !existingUserByContactNumber) {

			const DOBobj = DOB.day+"-"+DOB.month+"-"+DOB.year

			const appointmentObject = {
					date: null
				};

			// if (appointment && appointment.date) {
			// 	appointmentObject.date = appointment.date
			// }

			// Save user data to the database
			const newUser = new userSchema({
				cId,
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
				appointment: appointment,
				DOB: DOBobj,
				address1,
				address2,
				city,
				province,
				postalCode,
			});

			const committee = await Committee.findById(cId);

			// Check if the committee exists
			if (!committee) {
				return res.status(404).json({ success: false, message: 'Committee not found' });
			}

			// if (!committee.userIds || committee.userIds.length < committee.members) {
			// Push a new object with the desired properties to the committeeList array
			newUser.committeeList.push({ cid: committee._id, received: false });
			const savedUser = await newUser.save();

			res.status(200).json({ success: true, savedUser, message: 'User Saved successfully' });
			
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
};


// Function to generate a random verification code
function generateVerificationCode() {
	// Implement your own logic to generate a verification code
	// This could be a random string or a numeric code
}

// Function to send a verification email using SendGrid
async function sendVerificationEmail(email, verificationCode) {
	const msg = {
		to: email,
		from: 'invites@screenshottime.com', // Replace with your SendGrid verified sender email
		subject: 'Account Verification',
		text: `Your verification code is: ${verificationCode}`,
		html: `<p>Your verification code is: <strong>${verificationCode}</strong></p>`,
	};

	await sgMail.send(msg);
}


const userSignUpold = async (req, res, next) => {
	try {

		const {
			name, password, email, userType,
			nic, nicBack, residentialAddress, contactNumber, emergencyContact,
			emergencyContactRelation, bankName, bankBranchName, accountNumber,
			workAddress, jobOccupation, monthlyIncome, imageUrl,address2,
			city,
			province,
			postalCode,
		} = req.body;


		const existingUserByEmail = await userSchema.findOne({ email });
		const existingUserByContactNumber = await userSchema.findOne({ contactNumber });

		if (!existingUserByEmail || !existingUserByContactNumber) {

			// Generate expiration timestamp (2 hours from now)
			const expirationTimeInHours = 24;
			const expirationTimestamp = Date.now() + expirationTimeInHours * 60 * 60 * 1000; // Calculate the expiration timestamp (2 hours from now)

			const gLink = generateUniqueId({
				length: 9
			});

			// Hash the user's password
			const hashedPassword = await bcryptjs.hash(password, 12);

			// Save user data to the database
			const newUser = new userSchema({
				name, password: hashedPassword, email, userType,
				nic, nicBack, residentialAddress, contactNumber, emergencyContact,
				emergencyContactRelation, bankName, bankBranchName, accountNumber,
				workAddress, jobOccupation, monthlyIncome,
				gLink, imageUrl,address2,
				city,
				province,
				postalCode,
				expirationTimestamp: expirationTimestamp,
			});

			try {

				const inviteLink = `https://caiif-committee.vercel.app/create-account/${gLink}/${email}`;
				const msg = {
					to: email,
					from: 'support@caiif.ca', // replace this with your own email
					subject: 'You have been invited',
					text: `You have been invited. Please click on the following link to join the Caiif Committee`,
					html: `<p>You have been invited. Please click on the following link to join caiif : <a href="${inviteLink}">${inviteLink}</a></p>`
				};

				await sgMail.send(msg);
				const savedUser = await newUser.save();
				res.status(200).json({ success: true, savedUser, msg, message: 'Email sent successfully' });
			} catch (error) {
				console.error('Error sending email:', error);
				res.status(500).json({ success: false, message: 'Failed to send email' });
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
};

export default userSignUp;
