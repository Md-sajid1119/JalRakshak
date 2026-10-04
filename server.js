require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const crypto = require("crypto");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

const MONGO_URI =
    process.env.MONGO_URI ||
    "mongodb://127.0.0.1:27017/jalrakshak";


// ======================================================
// MIDDLEWARE
// ======================================================

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            "jalrakshak-secret-change-this-later",

        resave: false,
        saveUninitialized: false,

        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: false,
            maxAge: 1000 * 60 * 60 * 8
        }
    })
);

app.use(express.static(path.join(__dirname, "public")));


// ======================================================
// PASSWORD HASH
// ======================================================

function hashPassword(password) {
    return crypto
        .createHash("sha256")
        .update(String(password))
        .digest("hex");
}


// ======================================================
// ADMIN USER SCHEMA
// ======================================================

const adminUserSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        passwordHash: {
            type: String,
            required: true
        },

        role: {
            type: String,
            enum: [
                "mainAdmin",
                "governmentAdmin",
                "viewer"
            ],
            default: "governmentAdmin"
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AdminUser",
            default: null
        },

        active: {
            type: Boolean,
            default: true
        },

        createdAt: {
            type: Date,
            default: Date.now
        }
    }
);

const AdminUser = mongoose.model(
    "AdminUser",
    adminUserSchema
);


// ======================================================
// VOLUNTEER REQUEST SCHEMA
// ======================================================

const volunteerRequestSchema = new mongoose.Schema(
    {
        requestId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        mobile: {
            type: String,
            required: true,
            trim: true
        },

        emergencyDetails: {
            type: String,
            required: true,
            trim: true
        },

        location: {
            latitude: {
                type: Number,
                default: null
            },

            longitude: {
                type: Number,
                default: null
            }
        },

        isEmergency: {
            type: Boolean,
            default: false
        },

        status: {
            type: String,
            enum: [
                "Pending",
                "Accepted",
                "Completed"
            ],
            default: "Pending"
        },

        handledBy: {
            adminId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "AdminUser",
                default: null
            },

            username: {
                type: String,
                default: null
            },

            handledAt: {
                type: Date,
                default: null
            }
        },

        createdAt: {
            type: Date,
            default: Date.now
        }
    }
);

const VolunteerRequest = mongoose.model(
    "VolunteerRequest",
    volunteerRequestSchema
);


// ======================================================
// ACTIVITY LOG SCHEMA
// ======================================================

const activityLogSchema = new mongoose.Schema(
    {
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AdminUser",
            default: null
        },

        username: {
            type: String,
            default: null
        },

        action: {
            type: String,
            required: true
        },

        requestId: {
            type: String,
            default: null
        },

        details: {
            type: String,
            default: ""
        },

        createdAt: {
            type: Date,
            default: Date.now
        }
    }
);

const ActivityLog = mongoose.model(
    "ActivityLog",
    activityLogSchema
);


// ======================================================
// SAFE POINT SCHEMA
// ======================================================

const safePointSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        address: {
            type: String,
            default: ""
        },

        type: {
            type: String,
            enum: [
                "Safe Area",
                "Emergency Shelter",
                "Hospital",
                "Relief Center"
            ],
            default: "Safe Area"
        },

        latitude: {
            type: Number,
            required: true
        },

        longitude: {
            type: Number,
            required: true
        },

        active: {
            type: Boolean,
            default: true
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AdminUser",
            default: null
        },

        createdAt: {
            type: Date,
            default: Date.now
        },

        updatedAt: {
            type: Date,
            default: Date.now
        }
    }
);

const SafePoint = mongoose.model(
    "SafePoint",
    safePointSchema
);


// ======================================================
// MONGODB CONNECTION
// ======================================================

mongoose
    .connect(MONGO_URI)
    .then(async () => {
        console.log("MongoDB connected successfully");

        await migrateOldViewerRole();
        await ensureMainAdmin();
        await ensureDefaultSafePoints();
    })
    .catch((error) => {
        console.error(
            "MongoDB connection error:",
            error.message
        );
    });


// ======================================================
// MIGRATE OLD VIEWER ROLE
// ======================================================

async function migrateOldViewerRole() {
    try {
        const result = await AdminUser.updateMany(
            { role: "viewer" },
            { $set: { role: "governmentAdmin" } }
        );

        if (result.modifiedCount > 0) {
            console.log(
                `Migrated ${result.modifiedCount} old viewer account(s) to governmentAdmin.`
            );
        }
    } catch (error) {
        console.error(
            "Role migration error:",
            error.message
        );
    }
}


// ======================================================
// CREATE MAIN ADMIN IF NOT EXISTS
// ======================================================

async function ensureMainAdmin() {
    try {
        const existingMainAdmin =
            await AdminUser.findOne({
                role: "mainAdmin"
            });

        if (!existingMainAdmin) {
            const username =
                process.env.MAIN_ADMIN_USERNAME ||
                "mainadmin";

            const password =
                process.env.MAIN_ADMIN_PASSWORD ||
                "admin123";

            await AdminUser.create({
                username,
                passwordHash: hashPassword(password),
                role: "mainAdmin",
                active: true
            });

            console.log(
                `Main Admin created successfully. Username: ${username}`
            );
        } else {
            console.log(
                "Main Admin verified successfully."
            );
        }
    } catch (error) {
        console.error(
            "Main Admin setup error:",
            error.message
        );
    }
}


// ======================================================
// DEFAULT SAFE POINTS
// ======================================================

async function ensureDefaultSafePoints() {
    try {
        const count = await SafePoint.countDocuments();

        if (count > 0) {
            return;
        }

        const defaultSafePoints = [
            {
                name: "Verified Safe Area 1",
                address: "Mumbai Safe Zone",
                type: "Safe Area",
                latitude: 19.0760,
                longitude: 72.8777,
                active: true
            },

            {
                name: "Emergency Shelter 1",
                address: "Mumbai Emergency Shelter",
                type: "Emergency Shelter",
                latitude: 19.0820,
                longitude: 72.8900,
                active: true
            },

            {
                name: "Relief Center 1",
                address: "Mumbai Relief Center",
                type: "Relief Center",
                latitude: 19.0600,
                longitude: 72.9000,
                active: true
            }
        ];

        await SafePoint.insertMany(
            defaultSafePoints
        );

        console.log(
            "Default safe points created successfully."
        );
    } catch (error) {
        console.error(
            "Safe point setup error:",
            error.message
        );
    }
}


// ======================================================
// AUTH HELPERS
// ======================================================

async function getLoggedAdmin(req) {
    if (!req.session || !req.session.adminId) {
        return null;
    }

    try {
        const admin = await AdminUser.findById(
            req.session.adminId
        );

        if (!admin || !admin.active) {
            return null;
        }

        return admin;
    } catch (error) {
        return null;
    }
}


async function requireLogin(req, res, next) {
    const admin = await getLoggedAdmin(req);

    if (!admin) {
        return res.status(401).json({
            success: false,
            message: "Please login first."
        });
    }

    req.admin = admin;
    next();
}


async function requireMainAdmin(req, res, next) {
    const admin = await getLoggedAdmin(req);

    if (!admin) {
        return res.status(401).json({
            success: false,
            message: "Please login first."
        });
    }

    if (admin.role !== "mainAdmin") {
        return res.status(403).json({
            success: false,
            message:
                "Only Main Admin can perform this action."
        });
    }

    req.admin = admin;
    next();
}


// ======================================================
// ACTIVITY LOG HELPER
// ======================================================

async function createActivityLog({
    admin,
    action,
    requestId = null,
    details = ""
}) {
    try {
        await ActivityLog.create({
            adminId: admin ? admin._id : null,
            username: admin ? admin.username : null,
            action,
            requestId,
            details
        });
    } catch (error) {
        console.error(
            "Activity log error:",
            error.message
        );
    }
}


// ======================================================
// ADMIN LOGIN
// ======================================================

app.post(
    "/api/admin-login",
    async (req, res) => {
        try {
            const username =
                String(req.body.username || "").trim();

            const password =
                String(req.body.password || "");

            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Username and password are required."
                });
            }

            const admin =
                await AdminUser.findOne({
                    username
                });

            if (!admin) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid username or password."
                });
            }

            if (!admin.active) {
                return res.status(403).json({
                    success: false,
                    message:
                        "This admin account is disabled."
                });
            }

            const passwordHash =
                hashPassword(password);

            if (
                passwordHash !==
                admin.passwordHash
            ) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid username or password."
                });
            }

            req.session.adminId =
                admin._id.toString();

            await createActivityLog({
                admin,
                action: "Admin Login",
                details:
                    "Admin logged into JalRakshak dashboard."
            });

            return res.json({
                success: true,
                message: "Login successful.",
                admin: {
                    id: admin._id,
                    username: admin.username,
                    role: admin.role,
                    active: admin.active
                }
            });
        } catch (error) {
            console.error(
                "Admin login error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Server error during login."
            });
        }
    }
);


// ======================================================
// ADMIN ME
// ======================================================

app.get(
    "/api/admin-me",
    requireLogin,
    async (req, res) => {
        return res.json({
            success: true,
            admin: {
                id: req.admin._id,
                username: req.admin.username,
                role: req.admin.role,
                active: req.admin.active
            }
        });
    }
);


// ======================================================
// ADMIN LOGOUT
// ======================================================

app.post(
    "/api/admin-logout",
    async (req, res) => {
        try {
            const admin =
                await getLoggedAdmin(req);

            if (admin) {
                await createActivityLog({
                    admin,
                    action: "Admin Logout",
                    details:
                        "Admin logged out of JalRakshak dashboard."
                });
            }

            req.session.destroy(() => {
                res.json({
                    success: true,
                    message: "Logout successful."
                });
            });
        } catch (error) {
            console.error(
                "Logout error:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Logout failed."
            });
        }
    }
);


// ======================================================
// GOVERNMENT ADMINS - GET
// ======================================================

app.get(
    "/api/government-admins",
    requireMainAdmin,
    async (req, res) => {
        try {
            const admins =
                await AdminUser.find({
                    role: "governmentAdmin"
                })
                    .select("-passwordHash")
                    .sort({
                        createdAt: -1
                    });

            res.json({
                success: true,
                admins
            });
        } catch (error) {
            console.error(
                "Government admins fetch error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to fetch government admins."
            });
        }
    }
);


// ======================================================
// GOVERNMENT ADMIN - CREATE
// ======================================================

app.post(
    "/api/government-admins",
    requireMainAdmin,
    async (req, res) => {
        try {
            const username =
                String(
                    req.body.username || ""
                ).trim();

            const password =
                String(
                    req.body.password || ""
                );

            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Username and password are required."
                });
            }

            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Password must be at least 6 characters."
                });
            }

            const existing =
                await AdminUser.findOne({
                    username
                });

            if (existing) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Username already exists."
                });
            }

            const newAdmin =
                await AdminUser.create({
                    username,
                    passwordHash:
                        hashPassword(password),
                    role: "governmentAdmin",
                    createdBy:
                        req.admin._id,
                    active: true
                });

            await createActivityLog({
                admin: req.admin,
                action:
                    "Government Admin Created",
                details:
                    `Created government admin: ${username}`
            });

            res.status(201).json({
                success: true,
                message:
                    "Government admin created successfully.",
                admin: {
                    id: newAdmin._id,
                    username:
                        newAdmin.username,
                    role: newAdmin.role,
                    active:
                        newAdmin.active
                }
            });
        } catch (error) {
            console.error(
                "Government admin creation error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to create government admin."
            });
        }
    }
);


// ======================================================
// GOVERNMENT ADMIN STATUS
// ======================================================

app.put(
    "/api/government-admins/:id/status",
    requireMainAdmin,
    async (req, res) => {
        try {
            const admin =
                await AdminUser.findOne({
                    _id: req.params.id,
                    role: "governmentAdmin"
                });

            if (!admin) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Government admin not found."
                });
            }

            admin.active =
                Boolean(req.body.active);

            await admin.save();

            await createActivityLog({
                admin: req.admin,
                action:
                    "Government Admin Status Changed",
                details:
                    `${admin.username} is now ${
                        admin.active
                            ? "enabled"
                            : "disabled"
                    }.`
            });

            res.json({
                success: true,
                message:
                    `Government admin ${
                        admin.active
                            ? "enabled"
                            : "disabled"
                    }.`,
                admin: {
                    id: admin._id,
                    username:
                        admin.username,
                    role: admin.role,
                    active:
                        admin.active
                }
            });
        } catch (error) {
            console.error(
                "Government admin status error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to update admin status."
            });
        }
    }
);


// ======================================================
// GOVERNMENT ADMIN DELETE
// ======================================================

app.delete(
    "/api/government-admins/:id",
    requireMainAdmin,
    async (req, res) => {
        try {
            const admin =
                await AdminUser.findOne({
                    _id: req.params.id,
                    role: "governmentAdmin"
                });

            if (!admin) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Government admin not found."
                });
            }

            await AdminUser.deleteOne({
                _id: admin._id
            });

            await createActivityLog({
                admin: req.admin,
                action:
                    "Government Admin Deleted",
                details:
                    `Deleted government admin: ${admin.username}`
            });

            res.json({
                success: true,
                message:
                    "Government admin deleted successfully."
            });
        } catch (error) {
            console.error(
                "Government admin delete error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to delete government admin."
            });
        }
    }
);


// ======================================================
// GOVERNMENT ADMIN PASSWORD
// ======================================================

app.put(
    "/api/government-admins/:id/password",
    requireMainAdmin,
    async (req, res) => {
        try {
            const password =
                String(
                    req.body.password || ""
                );

            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Password must be at least 6 characters."
                });
            }

            const admin =
                await AdminUser.findOne({
                    _id: req.params.id,
                    role: "governmentAdmin"
                });

            if (!admin) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Government admin not found."
                });
            }

            admin.passwordHash =
                hashPassword(password);

            await admin.save();

            await createActivityLog({
                admin: req.admin,
                action:
                    "Government Admin Password Changed",
                details:
                    `Changed password for ${admin.username}`
            });

            res.json({
                success: true,
                message:
                    "Government admin password updated successfully."
            });
        } catch (error) {
            console.error(
                "Government admin password error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to update password."
            });
        }
    }
);


// ======================================================
// CURRENT ADMIN CHANGE PASSWORD
// ======================================================

app.put(
    "/api/admin/change-password",
    requireLogin,
    async (req, res) => {
        try {
            const currentPassword =
                String(
                    req.body.currentPassword || ""
                );

            const newPassword =
                String(
                    req.body.newPassword || ""
                );

            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Current and new password are required."
                });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    message:
                        "New password must be at least 6 characters."
                });
            }

            if (
                hashPassword(
                    currentPassword
                ) !== req.admin.passwordHash
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Current password is incorrect."
                });
            }

            req.admin.passwordHash =
                hashPassword(newPassword);

            await req.admin.save();

            await createActivityLog({
                admin: req.admin,
                action:
                    "Admin Password Changed",
                details:
                    "Current admin changed their password."
            });

            res.json({
                success: true,
                message:
                    "Password changed successfully."
            });
        } catch (error) {
            console.error(
                "Change password error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to change password."
            });
        }
    }
);


// ======================================================
// CREATE VOLUNTEER REQUEST
// ======================================================

app.post(
    "/api/volunteer-request",
    async (req, res) => {
        try {
            const name =
                String(
                    req.body.name || ""
                ).trim();

            const mobile =
                String(
                    req.body.mobile || ""
                ).trim();

            const emergencyDetails =
                String(
                    req.body.emergencyDetails || ""
                ).trim();

            const isEmergency =
                Boolean(
                    req.body.isEmergency
                );

            const latitude =
                req.body.location &&
                req.body.location.latitude !==
                    undefined
                    ? Number(
                          req.body.location
                              .latitude
                      )
                    : null;

            const longitude =
                req.body.location &&
                req.body.location.longitude !==
                    undefined
                    ? Number(
                          req.body.location
                              .longitude
                      )
                    : null;

            if (
                !name ||
                !mobile ||
                !emergencyDetails
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Name, mobile and emergency details are required."
                });
            }

            if (
                !/^[6-9]\d{9}$/.test(
                    mobile
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Please enter a valid 10-digit Indian mobile number."
                });
            }

            const requestId =
                `JR-${Math.floor(
                    100000 +
                        Math.random() *
                            900000
                )}`;

            const request =
                await VolunteerRequest.create({
                    requestId,
                    name,
                    mobile,
                    emergencyDetails,
                    location: {
                        latitude:
                            Number.isFinite(
                                latitude
                            )
                                ? latitude
                                : null,

                        longitude:
                            Number.isFinite(
                                longitude
                            )
                                ? longitude
                                : null
                    },
                    isEmergency,
                    status: "Pending"
                });

            res.status(201).json({
                success: true,
                message:
                    "Help request submitted successfully.",
                requestId:
                    request.requestId,
                request
            });
        } catch (error) {
            console.error(
                "Volunteer request error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to submit help request."
            });
        }
    }
);


// ======================================================
// GET ALL VOLUNTEER REQUESTS
// ======================================================

app.get(
    "/api/volunteer-requests",
    requireLogin,
    async (req, res) => {
        try {
            const requests =
                await VolunteerRequest.find()
                    .sort({
                        createdAt: -1
                    })
                    .lean();

            res.json({
                success: true,
                requests
            });
        } catch (error) {
            console.error(
                "Volunteer requests fetch error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to fetch volunteer requests."
            });
        }
    }
);


// ======================================================
// GET SINGLE REQUEST STATUS
// ======================================================

app.get(
    "/api/volunteer-request/:requestId",
    async (req, res) => {
        try {
            const requestId =
                String(
                    req.params.requestId || ""
                ).trim();

            let request =
                await VolunteerRequest.findOne({
                    requestId
                }).lean();

            if (!request) {
                if (
                    mongoose.Types.ObjectId.isValid(
                        requestId
                    )
                ) {
                    request =
                        await VolunteerRequest.findById(
                            requestId
                        ).lean();
                }
            }

            if (!request) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Request not found."
                });
            }

            res.json({
                success: true,
                request
            });
        } catch (error) {
            console.error(
                "Request status error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to check request status."
            });
        }
    }
);


// ======================================================
// UPDATE REQUEST STATUS
// ======================================================

app.put(
    "/api/volunteer-requests/:id/status",
    requireLogin,
    async (req, res) => {
        try {
            const id =
                String(
                    req.params.id || ""
                ).trim();

            const newStatus =
                String(
                    req.body.status || ""
                ).trim();

            const allowedStatuses = [
                "Pending",
                "Accepted",
                "Completed"
            ];

            if (
                !allowedStatuses.includes(
                    newStatus
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid request status."
                });
            }

            let request = null;

            if (
                mongoose.Types.ObjectId.isValid(
                    id
                )
            ) {
                request =
                    await VolunteerRequest.findById(
                        id
                    );
            }

            if (!request) {
                request =
                    await VolunteerRequest.findOne({
                        requestId: id
                    });
            }

            if (!request) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Request not found."
                });
            }

            request.status = newStatus;

            if (
                newStatus === "Accepted" ||
                newStatus === "Completed"
            ) {
                request.handledBy = {
                    adminId:
                        req.admin._id,

                    username:
                        req.admin.username,

                    handledAt:
                        new Date()
                };
            }

            if (
                newStatus === "Pending"
            ) {
                request.handledBy = {
                    adminId: null,
                    username: null,
                    handledAt: null
                };
            }

            await request.save();

            await createActivityLog({
                admin: req.admin,

                action:
                    `Request Status Changed to ${newStatus}`,

                requestId:
                    request.requestId,

                details:
                    `Request ${request.requestId} status changed to ${newStatus}.`
            });

            res.json({
                success: true,

                message:
                    `Request status updated to ${newStatus}.`,

                request
            });
        } catch (error) {
            console.error(
                "Request status update error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to update request status."
            });
        }
    }
);


// ======================================================
// DELETE VOLUNTEER REQUEST
// ======================================================

app.delete(
    "/api/volunteer-request/:requestId",
    requireLogin,
    async (req, res) => {
        try {
            const requestId =
                String(
                    req.params.requestId || ""
                ).trim();

            const request =
                await VolunteerRequest.findOne({
                    requestId
                });

            if (!request) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Request not found."
                });
            }

            await VolunteerRequest.deleteOne({
                _id: request._id
            });

            await createActivityLog({
                admin: req.admin,

                action:
                    "Volunteer Request Deleted",

                requestId:
                    request.requestId,

                details:
                    `Deleted request ${request.requestId} submitted by ${request.name}.`
            });

            res.json({
                success: true,
                message:
                    "Request deleted successfully."
            });
        } catch (error) {
            console.error(
                "Request delete error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to delete request."
            });
        }
    }
);


// ======================================================
// GET ACTIVE SAFE POINTS
// ======================================================

app.get(
    "/api/safe-points",
    async (req, res) => {
        try {
            const safePoints =
                await SafePoint.find({
                    active: true
                })
                    .sort({
                        createdAt: -1
                    })
                    .lean();

            res.json({
                success: true,
                safePoints
            });
        } catch (error) {
            console.error(
                "Safe points fetch error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to fetch safe points."
            });
        }
    }
);


// ======================================================
// ADMIN SAFE POINTS
// ======================================================

app.get(
    "/api/admin/safe-points",
    requireLogin,
    async (req, res) => {
        try {
            const safePoints =
                await SafePoint.find()
                    .sort({
                        createdAt: -1
                    })
                    .lean();

            res.json({
                success: true,
                safePoints
            });
        } catch (error) {
            console.error(
                "Admin safe points fetch error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to fetch safe points."
            });
        }
    }
);


// ======================================================
// CREATE SAFE POINT
// ======================================================

app.post(
    "/api/admin/safe-points",
    requireMainAdmin,
    async (req, res) => {
        try {
            const name =
                String(
                    req.body.name || ""
                ).trim();

            const address =
                String(
                    req.body.address || ""
                ).trim();

            const type =
                String(
                    req.body.type ||
                        "Safe Area"
                ).trim();

            const latitude =
                Number(
                    req.body.latitude
                );

            const longitude =
                Number(
                    req.body.longitude
                );

            if (
                !name ||
                !Number.isFinite(
                    latitude
                ) ||
                !Number.isFinite(
                    longitude
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Name, latitude and longitude are required."
                });
            }

            const allowedTypes = [
                "Safe Area",
                "Emergency Shelter",
                "Hospital",
                "Relief Center"
            ];

            if (
                !allowedTypes.includes(
                    type
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid safe point type."
                });
            }

            const safePoint =
                await SafePoint.create({
                    name,
                    address,
                    type,
                    latitude,
                    longitude,
                    active: true,
                    createdBy:
                        req.admin._id
                });

            await createActivityLog({
                admin: req.admin,
                action:
                    "Safe Point Created",
                details:
                    `Created safe point: ${name}`
            });

            res.status(201).json({
                success: true,
                message:
                    "Safe point created successfully.",
                safePoint
            });
        } catch (error) {
            console.error(
                "Safe point create error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to create safe point."
            });
        }
    }
);


// ======================================================
// UPDATE SAFE POINT
// ======================================================

app.put(
    "/api/admin/safe-points/:id",
    requireMainAdmin,
    async (req, res) => {
        try {
            const safePoint =
                await SafePoint.findById(
                    req.params.id
                );

            if (!safePoint) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Safe point not found."
                });
            }

            if (
                req.body.name !==
                undefined
            ) {
                safePoint.name =
                    String(
                        req.body.name
                    ).trim();
            }

            if (
                req.body.address !==
                undefined
            ) {
                safePoint.address =
                    String(
                        req.body.address
                    ).trim();
            }

            if (
                req.body.type !==
                undefined
            ) {
                safePoint.type =
                    String(
                        req.body.type
                    ).trim();
            }

            if (
                req.body.latitude !==
                undefined
            ) {
                const latitude =
                    Number(
                        req.body.latitude
                    );

                if (
                    Number.isFinite(
                        latitude
                    )
                ) {
                    safePoint.latitude =
                        latitude;
                }
            }

            if (
                req.body.longitude !==
                undefined
            ) {
                const longitude =
                    Number(
                        req.body.longitude
                    );

                if (
                    Number.isFinite(
                        longitude
                    )
                ) {
                    safePoint.longitude =
                        longitude;
                }
            }

            if (
                req.body.active !==
                undefined
            ) {
                safePoint.active =
                    Boolean(
                        req.body.active
                    );
            }

            safePoint.updatedAt =
                new Date();

            await safePoint.save();

            await createActivityLog({
                admin: req.admin,
                action:
                    "Safe Point Updated",
                details:
                    `Updated safe point: ${safePoint.name}`
            });

            res.json({
                success: true,
                message:
                    "Safe point updated successfully.",
                safePoint
            });
        } catch (error) {
            console.error(
                "Safe point update error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to update safe point."
            });
        }
    }
);


// ======================================================
// DELETE SAFE POINT
// ======================================================

app.delete(
    "/api/admin/safe-points/:id",
    requireMainAdmin,
    async (req, res) => {
        try {
            const safePoint =
                await SafePoint.findById(
                    req.params.id
                );

            if (!safePoint) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Safe point not found."
                });
            }

            await SafePoint.deleteOne({
                _id: safePoint._id
            });

            await createActivityLog({
                admin: req.admin,
                action:
                    "Safe Point Deleted",
                details:
                    `Deleted safe point: ${safePoint.name}`
            });

            res.json({
                success: true,
                message:
                    "Safe point deleted successfully."
            });
        } catch (error) {
            console.error(
                "Safe point delete error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to delete safe point."
            });
        }
    }
);


// ======================================================
// ACTIVITY LOGS
// ======================================================

app.get(
    "/api/activity-logs",
    requireLogin,
    async (req, res) => {
        try {
            const logs =
                await ActivityLog.find()
                    .sort({
                        createdAt: -1
                    })
                    .limit(500)
                    .lean();

            res.json({
                success: true,
                logs
            });
        } catch (error) {
            console.error(
                "Activity logs error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to fetch activity logs."
            });
        }
    }
);


app.get(
    "/api/admin/activity-logs",
    requireLogin,
    async (req, res) => {
        try {
            const logs =
                await ActivityLog.find()
                    .sort({
                        createdAt: -1
                    })
                    .limit(500)
                    .lean();

            res.json({
                success: true,
                logs
            });
        } catch (error) {
            console.error(
                "Admin activity logs error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to fetch activity logs."
            });
        }
    }
);


// ======================================================
// GEMINI RETRY HELPER
// ======================================================

function wait(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}


async function callGeminiWithRetry({
    apiKey,
    mimeType,
    cleanBase64,
    prompt
}) {
    const model =
        "gemini-3.8-flash";

    const maxAttempts = 3;

    // Wait times:
    // Attempt 1 fails -> 2 seconds
    // Attempt 2 fails -> 5 seconds
    const retryDelays = [
        2000,
        5000
    ];

    let lastStatus = null;
    let lastResponseText = "";

    for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt++
    ) {
        try {
            console.log(
                `Gemini request attempt ${attempt}/${maxAttempts}...`
            );

            const response =
                await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            contents: [
                                {
                                    parts: [
                                        {
                                            text:
                                                prompt
                                        },

                                        {
                                            inline_data:
                                                {
                                                    mime_type:
                                                        mimeType,

                                                    data:
                                                        cleanBase64
                                                }
                                        }
                                    ]
                                }
                            ]
                        })
                    }
                );

            const responseText =
                await response.text();

            lastStatus =
                response.status;

            lastResponseText =
                responseText;

            // Success
            if (response.ok) {
                console.log(
                    `Gemini request successful on attempt ${attempt}.`
                );

                return {
                    success: true,
                    status:
                        response.status,
                    responseText
                };
            }

            console.error(
                `Gemini API error on attempt ${attempt}:`,
                response.status,
                responseText
            );

            // Retry only temporary service errors
            const shouldRetry =
                response.status === 503 ||
                response.status === 429 ||
                response.status === 500 ||
                response.status === 502 ||
                response.status === 504;

            if (
                shouldRetry &&
                attempt < maxAttempts
            ) {
                const delay =
                    retryDelays[
                        attempt - 1
                    ] || 5000;

                console.log(
                    `Gemini temporary error. Retrying in ${delay / 1000} seconds...`
                );

                await wait(delay);

                continue;
            }

            // Permanent error or all retries exhausted
            return {
                success: false,
                status:
                    response.status,
                responseText
            };
        } catch (error) {
            console.error(
                `Gemini network error on attempt ${attempt}:`,
                error.message
            );

            if (
                attempt < maxAttempts
            ) {
                const delay =
                    retryDelays[
                        attempt - 1
                    ] || 5000;

                console.log(
                    `Retrying Gemini request in ${delay / 1000} seconds...`
                );

                await wait(delay);

                continue;
            }

            return {
                success: false,
                status:
                    lastStatus,
                responseText:
                    lastResponseText,
                error:
                    error.message
            };
        }
    }

    return {
        success: false,
        status: lastStatus,
        responseText:
            lastResponseText
    };
}


// ======================================================
// GEMINI FLOOD ANALYSIS
// ======================================================

app.post(
    "/api/analyze-flood",
    async (req, res) => {
        try {
            const apiKey =
                process.env.GEMINI_API_KEY;

            if (!apiKey) {
                return res.status(500).json({
                    success: false,
                    message:
                        "Gemini API key is not configured."
                });
            }

            // Accept frontend image field
            let imageBase64 =
                req.body.image ||
                req.body.imageBase64 ||
                req.body.base64 ||
                "";

            let mimeType =
                String(
                    req.body.mimeType ||
                        "image/jpeg"
                );

            if (!imageBase64) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Flood image is required."
                });
            }

            // Handle complete data URL
            if (
                imageBase64.startsWith(
                    "data:"
                )
            ) {
                const match =
                    imageBase64.match(
                        /^data:(.+?);base64,(.+)$/
                    );

                if (match) {
                    mimeType =
                        match[1] ||
                        mimeType;

                    imageBase64 =
                        match[2];
                }
            }

            // Remove spaces/newlines
            const cleanBase64 =
                String(
                    imageBase64
                ).replace(
                    /\s/g,
                    ""
                );

            if (!cleanBase64) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid flood image data."
                });
            }

            if (
                !mimeType.startsWith(
                    "image/"
                )
            ) {
                mimeType =
                    "image/jpeg";
            }


            // ==================================================
            // GEMINI PROMPT
            // ==================================================

            const prompt = `
You are JalRakshak, an urban flood safety assistant.

Analyze the provided flood image carefully.

Return ONLY valid JSON.
Do not use markdown.
Do not add explanation outside JSON.

Use exactly this format:

{
  "dangerLevel": "Low | Moderate | High | Critical",
  "waterLevel": "Low | Medium | High | Very High",
  "safetyMessage": "short practical safety advice"
}

Consider visible:
- flood water depth
- road flooding
- vehicles in water
- people in danger
- open drains
- unsafe roads
- downed electrical wires
- possible current/electrical hazards
- blocked roads
- fast-moving water

Safety rules:
- Never encourage a person to enter deep or fast-moving flood water.
- If electrical hazards are visible, warn the user to stay away.
- If the image is unclear, be conservative and advise moving toward a verified safe area.
- Keep the safety message short and practical.
`;


            // ==================================================
            // GEMINI REQUEST WITH AUTOMATIC RETRY
            // ==================================================

            const geminiResult =
                await callGeminiWithRetry({
                    apiKey,
                    mimeType,
                    cleanBase64,
                    prompt
                });


            if (!geminiResult.success) {
                console.error(
                    "Gemini API failed after retries:",
                    geminiResult.status,
                    geminiResult.responseText
                );

                let errorMessage =
                    "Flood analysis service failed.";

                if (
                    geminiResult.status ===
                    503
                ) {
                    errorMessage =
                        "Gemini is temporarily busy. Please try again in a moment.";
                }

                if (
                    geminiResult.status ===
                    429
                ) {
                    errorMessage =
                        "Gemini request limit was reached. Please try again shortly.";
                }

                return res.status(500).json({
                    success: false,
                    message:
                        errorMessage,

                    details:
                        geminiResult.responseText
                });
            }


            // ==================================================
            // PARSE GEMINI RESPONSE
            // ==================================================

            let geminiData;

            try {
                geminiData =
                    JSON.parse(
                        geminiResult.responseText
                    );
            } catch (error) {
                console.error(
                    "Gemini response JSON parse error:",
                    error
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Invalid response from flood analysis service."
                });
            }


            const text =
                geminiData
                    ?.candidates?.[0]
                    ?.content?.parts
                    ?.map(
                        (part) =>
                            part.text || ""
                    )
                    .join("")
                    .trim();


            if (!text) {
                console.error(
                    "Gemini returned empty response:",
                    JSON.stringify(
                        geminiData,
                        null,
                        2
                    )
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Flood analysis returned an empty result."
                });
            }


            // ==================================================
            // CLEAN MARKDOWN
            // ==================================================

            const cleanedText =
                text
                    .replace(
                        /^```json\s*/i,
                        ""
                    )
                    .replace(
                        /^```\s*/i,
                        ""
                    )
                    .replace(
                        /\s*```$/i,
                        ""
                    )
                    .trim();


            // ==================================================
            // PARSE RESULT
            // ==================================================

            let result;

            try {
                result =
                    JSON.parse(
                        cleanedText
                    );
            } catch (error) {
                console.error(
                    "Gemini result parse error:",
                    cleanedText
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to understand flood analysis result."
                });
            }


            // ==================================================
            // VALIDATE DANGER LEVEL
            // ==================================================

            const dangerLevels = [
                "Low",
                "Moderate",
                "High",
                "Critical"
            ];

            const waterLevels = [
                "Low",
                "Medium",
                "High",
                "Very High"
            ];


            if (
                !dangerLevels.includes(
                    result.dangerLevel
                )
            ) {
                result.dangerLevel =
                    "Moderate";
            }


            if (
                !waterLevels.includes(
                    result.waterLevel
                )
            ) {
                result.waterLevel =
                    "Medium";
            }


            if (
                !result.safetyMessage
            ) {
                result.safetyMessage =
                    "Avoid deep water, open drains and electrical hazards. Move towards a verified safe area.";
            }


            // ==================================================
            // SEND RESULT TO FRONTEND
            // ==================================================

            return res.json({
                success: true,

                dangerLevel:
                    result.dangerLevel,

                waterLevel:
                    result.waterLevel,

                safetyMessage:
                    result.safetyMessage
            });
        } catch (error) {
            console.error(
                "Flood analysis server error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Flood analysis service failed.",
                details:
                    error.message
            });
        }
    }
);


// ======================================================
// HEALTH CHECK
// ======================================================

app.get(
    "/api/health",
    async (req, res) => {
        try {
            const mongoState =
                mongoose.connection.readyState;

            res.json({
                success: true,

                server: "online",

                mongodb:
                    mongoState === 1
                        ? "connected"
                        : "disconnected",

                gemini:
                    Boolean(
                        process.env
                            .GEMINI_API_KEY
                    )
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message:
                    "Health check failed."
            });
        }
    }
);


// ======================================================
// HOME PAGE
// ======================================================

app.get(
    "/",
    (req, res) => {
        res.sendFile(
            path.join(
                __dirname,
                "public",
                "index.html"
            )
        );
    }
);


// ======================================================
// ERROR HANDLER
// ======================================================

app.use(
    (err, req, res, next) => {
        console.error(
            "Unhandled server error:",
            err
        );

        res.status(500).json({
            success: false,
            message:
                "Internal server error."
        });
    }
);


// ======================================================
// START SERVER
// ======================================================

app.listen(
    PORT,
    () => {
        console.log(
            `Server is running on http://localhost:${PORT}`
        );

        if (
            process.env.GEMINI_API_KEY
        ) {
            console.log(
                "Gemini API key found."
            );
        } else {
            console.log(
                "WARNING: Gemini API key not found in .env"
            );
        }
    }
);