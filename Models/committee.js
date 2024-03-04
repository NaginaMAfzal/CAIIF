const mongoose = require('mongoose');
import User from './userSchema';

const committeeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
        },
        amount: {
            type: String,
        },
        // other fields...
        cycle: {
            type: {
                type: String,
            },
            value: String,
        },
        payment: {
            type: String
        },
        startDate: {
            type: Date
        },
        endDate: {
            type: Date
        },
        members: {
            type: String
        },
        userIds: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],
        recievedBy: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],
        completed: {
            type: Boolean,
            default: false
        },
        uniqueId: {
            type: String
        }
    },
    {
        timestamps: true,
    },
);

// Add this pre middleware to your committee schema
committeeSchema.pre('remove', async function (next) {
    try {
        // Find users who have this committee in their committeeList or recieveList
        const usersToUpdate = await User.find({
            $or: [
                { 'committeeList.cid': this._id },
                { 'recieveList': this._id }
            ]
        });

        // Update each user's committeeList and recieveList
        await Promise.all(usersToUpdate.map(async (user) => {
            user.committeeList = user.committeeList.filter(item => item.cid.toString() !== this._id.toString());
            user.recieveList = user.recieveList.filter(item => item.toString() !== this._id.toString());
            await user.save();
        }));

        // Continue with the remove operation
        next();
    } catch (error) {
        next(error);
    }
});

export default mongoose.model('Committee', committeeSchema);
