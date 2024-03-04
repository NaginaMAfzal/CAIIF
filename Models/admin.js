const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    password: {
        type: String,
    },
    email: {
        type: String,
    },
    userType: {
        type: String,
        default: 'admin',
    },

}, {
    timestamps: true,
}, );

export default mongoose.model('Admin', AdminSchema);