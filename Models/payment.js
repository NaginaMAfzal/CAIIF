const mongoose = require('mongoose');
import Committee from './committee'; // Adjust the path based on your actual file structure

const payment = new mongoose.Schema(
	{
		cid: {
			 type: mongoose.Schema.Types.ObjectId, ref: 'Committee' ,
		},
        userId: {
            type: mongoose.Schema.Types.ObjectId, ref: 'User' ,
       },
        paymentAmount: {
            type: String
        },
		isPaid : {
            type: String
        },
		date: {
			type: String,
		},
		note: {
			type : String
		}
	},
	{
		timestamps: true,
	},
);
// // Add this pre middleware to your user schema
// payment.pre('remove', async function (next) {
//     try {
//         // Remove the user from the committees where they are associated (userIds and receivedBy)
//         await Committee.updateMany(
//             { $or: [{ userIds: this._id }, { receivedBy: this._id }] },
//             { $pull: { userIds: this._id, receivedBy: this._id } }
//         );

//         // Continue with the remove operation
//         next();
//     } catch (error) {
//         next(error);
//     }
// });

export default mongoose.model('Payment', payment);