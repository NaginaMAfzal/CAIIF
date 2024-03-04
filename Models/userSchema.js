const mongoose = require('mongoose');
import Committee from './committee'; // Adjust the path based on your actual file structure

const userSchema = new mongoose.Schema(
	{
		firstName: {
			type: String,
			required: true,
		},
		lastName: {
			type: String,
			required: true,
		},
		password: {
			type: String,
		},
		email: {
			type: String,
			required: true
		},
		userType: {
			type: String,
			default: 'user',
		},

		// personal data 
		nic: {
			type: String,
			required: true
		},
		// personal data 
		sin: {
			type: String,
		},
		residentialAddress: {
			type: String
		},
		residentialStatus: {
			type: String
		},
		contactNumber: {
			type: String,
			required: true
		},
		emergencyContact: {
			type: String
		},
		emergencyContactRelation: {
			type: String
		},
		grossAnnualIncome: {
			type: String
		},
		sourceOfIncome: {
			type: String
		},
		employmentStatus: {
			type: String
		},

		// interestedDate: {
		// 	type: String
		// },
		// Bank detail 
		bankName: {
			type: String,
		},
		bankBranchName: {
			type: String
		},
		accountNumber: {
			type: String
		},

		// job Detail 
		workAddress: {
			type: String
		},
		jobOccupation: {
			type: String
		},
		monthlyIncome: {
			type: String
		},

		//  verifications
		verify: {
			type: Boolean,
			default: false
		},
		gLink: {
			type: String,
			default: 'null'
		},
		expirationTimestamp: {
			type: String
		},
		otpTime: {
			type: String
		},
		inviteStatus: {
			type: Boolean,
			default: false,
		},
		approve: {
			type: Boolean,
			default: false,
		},
		level: {
			type: String,
			default: '1',
		},
		committeeList: [{
			cid: { type: mongoose.Schema.Types.ObjectId, ref: 'Committee' },
			received: { type: Boolean, default: false },
			committeeNumber: { type: String, default: '0' },
		}],
		recieveList: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Committee',
		}],
		note: {
			type: String,
		},
		block: {
			type: Boolean,
			default: false,
		},
		adminNotes: [{
			note: { type: String },
		}],
		DOB: {
			type: String,
		},
		address1: {
			type: String,
		},
		address2: {
			type: String,
		},
		city: {
			type: String,
		},
		province: {
			type: String,
		},
		postalCode: {
			type: String,
		},
		// availability
		appointment: {
			type: String,
			// time: { to: String, from: String }
		}
	},
	{
		timestamps: true,
	},
);
// Add this pre middleware to your user schema
userSchema.pre('remove', async function (next) {
	try {
		// Remove the user from the committees where they are associated (userIds and receivedBy)
		await Committee.updateMany(
			{ $or: [{ userIds: this._id }, { receivedBy: this._id }] },
			{ $pull: { userIds: this._id, receivedBy: this._id } }
		);

		// Continue with the remove operation
		next();
	} catch (error) {
		next(error);
	}
});

export default mongoose.model('User', userSchema);
